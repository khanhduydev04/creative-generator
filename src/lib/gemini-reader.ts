import {
  geminiGenerate,
  GEMINI_TEXT_MODEL,
  Type,
} from "@/services/geminiClient";
import { claudeVisionAnalyze } from "@/services/claudeClient";
import { safeJsonParse } from "@/lib/json-utils";
import { assertSafeOutboundUrl, UnsafeUrlError } from "@/lib/url-guard";
import * as cheerio from "cheerio";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductContext {
  brandName: string;
  productName: string;
  tagline: string | null;
  packagingForm: string;
  physicalDimensions: string;
  productFormDetails: string;
  claims: string[];
  keyIngredients: string[];
  benefits: string[];
  tone: string;
  targetSignals: string[];
  rawSummary: string;
  // Extended fields for richer ad content
  priceInfo: string | null;
  servingInfo: string | null;
  certifications: string[];
  socialProof: string | null;
  flavorVariant: string | null;
  uniqueSellingPoints: string[];
  visualIdentifiers: string;
}

export interface CompetitorAdAnalysis {
  layout: string;
  colorScheme: string;
  typographyStyle: string;
  visualHierarchy: string;
  composition: string;
  textPlacement: string;
  mood: string;
  strengths: string[];
  weaknesses: string[];
  replicationGuide: string;
  // Enhanced fields for deeper replication + optimization
  creativeConcept: string;
  productPresentation: string;
  propsAndContext: string;
  textContent: string;
  authenticityScore: string;
  improvementOpportunities: string[];
  // Ad type detection — determines which prompt strategy to use
  adType: "traditional" | "stealth_native" | "ugc";
  funnelStage: "unaware" | "problem_aware" | "solution_aware" | "product_aware";
  productVisibility: "hero" | "prominent" | "supporting" | "incidental" | "absent";
  stealthCategory: "ENV" | "FMT" | "STR" | "HUM" | null;
  textDensity: "heavy" | "moderate" | "minimal" | "none";
  brandingLevel: "strong" | "subtle" | "none";
  // Human element detection — determines whether output may include people
  hasHumanElements: boolean;
  humanDescription: string | null;
}

export interface CompetitorProductContext {
  competitorName: string;
  claims: string[];
  weaknesses: string[];
  rawSummary: string;
}

// ─── Fetch & Extract Page Content ────────────────────────────────────────────

/**
 * Fetch a URL and extract meaningful text content from its HTML.
 * Strips scripts, styles, nav, footer, and other non-content elements.
 * Returns clean text capped at ~8000 chars to avoid token bloat.
 */
async function fetchPageContent(url: string, maxChars: number = 8000): Promise<string> {
  // SSRF guard — reject internal/private targets before any network call
  let safeUrl: URL;
  try {
    safeUrl = assertSafeOutboundUrl(url);
  } catch (e) {
    if (e instanceof UnsafeUrlError) {
      throw new Error(`refusing to fetch unsafe URL: ${e.reason}`);
    }
    throw e;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(safeUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page (${response.status}): ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove non-content elements
    $("script, style, noscript, iframe, svg, nav, footer, header").remove();
    $("[role='navigation'], [role='banner'], [role='contentinfo']").remove();
    $(".cookie-banner, .popup, .modal, .newsletter-signup").remove();

    // Extract structured data if available (JSON-LD)
    let jsonLdData = "";
    $('script[type="application/ld+json"]').each((_, el) => {
      // Scripts were removed above, but JSON-LD is parsed before removal
      // Re-parse from the original HTML for JSON-LD
    });

    // Re-extract JSON-LD from original HTML (before cheerio removal)
    const jsonLdMatches = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );
    if (jsonLdMatches) {
      const jsonLdParts: string[] = [];
      for (const match of jsonLdMatches) {
        const content = match.replace(/<\/?script[^>]*>/gi, "").trim();
        try {
          const parsed = JSON.parse(content) as Record<string, unknown>;
          // Only keep product-related structured data
          const type = String(parsed["@type"] ?? "").toLowerCase();
          if (type === "product" || type === "offer" || type === "brand") {
            jsonLdParts.push(JSON.stringify(parsed, null, 0));
          }
        } catch {
          // Skip invalid JSON-LD
        }
      }
      if (jsonLdParts.length > 0) {
        jsonLdData = "\n\n[STRUCTURED DATA]\n" + jsonLdParts.join("\n");
      }
    }

    // Extract meta tags
    const metaParts: string[] = [];
    const title = $("title").text().trim();
    if (title) metaParts.push(`Title: ${title}`);

    const metaDesc = $('meta[name="description"]').attr("content")?.trim();
    if (metaDesc) metaParts.push(`Description: ${metaDesc}`);

    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
    if (ogTitle && ogTitle !== title) metaParts.push(`OG Title: ${ogTitle}`);

    const ogDesc = $('meta[property="og:description"]').attr("content")?.trim();
    if (ogDesc && ogDesc !== metaDesc) metaParts.push(`OG Description: ${ogDesc}`);

    const metaSection = metaParts.length > 0
      ? "[META]\n" + metaParts.join("\n") + "\n\n"
      : "";

    // Extract main body text
    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const fullContent = metaSection + "[PAGE CONTENT]\n" + bodyText + jsonLdData;

    // Cap content length — caller can override via maxChars parameter
    if (fullContent.length > maxChars) {
      return fullContent.substring(0, maxChars) + "\n[...truncated]";
    }

    return fullContent;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Read Product Landing Page ───────────────────────────────────────────────

// Content size tiers for progressive retry (largest → smallest)
const CONTENT_SIZE_TIERS = [20000, 15000, 10000, 6000] as const;

export async function readProductPage(userId: string, url: string): Promise<ProductContext> {
  // Fetch the actual page content with expanded limit for richer extraction
  let pageContent: string;
  let fetchedChars: number;
  try {
    pageContent = await fetchPageContent(url, CONTENT_SIZE_TIERS[0]);
    fetchedChars = CONTENT_SIZE_TIERS[0];
    console.log(
      `[gemini-reader] Fetched product page content: ${pageContent.length} chars from ${url}`,
    );
  } catch (err) {
    console.warn(
      `[gemini-reader] Failed to fetch product page, falling back to URL-only: ${err instanceof Error ? err.message : String(err)}`,
    );
    pageContent = `[FAILED TO FETCH — analyze based on URL pattern only]\nURL: ${url}`;
    fetchedChars = 0;
  }

  const structuredOutput = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        brandName: { type: Type.STRING },
        productName: { type: Type.STRING },
        tagline: { type: Type.STRING, nullable: true },
        packagingForm: { type: Type.STRING },
        physicalDimensions: { type: Type.STRING },
        productFormDetails: { type: Type.STRING },
        claims: { type: Type.ARRAY, items: { type: Type.STRING } },
        keyIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
        benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
        tone: { type: Type.STRING },
        targetSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
        rawSummary: { type: Type.STRING },
        priceInfo: { type: Type.STRING, nullable: true },
        servingInfo: { type: Type.STRING, nullable: true },
        certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
        socialProof: { type: Type.STRING, nullable: true },
        flavorVariant: { type: Type.STRING, nullable: true },
        uniqueSellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        visualIdentifiers: { type: Type.STRING },
      },
      required: [
        "brandName",
        "productName",
        "tagline",
        "packagingForm",
        "physicalDimensions",
        "productFormDetails",
        "claims",
        "keyIngredients",
        "benefits",
        "tone",
        "targetSignals",
        "rawSummary",
        "priceInfo",
        "servingInfo",
        "certifications",
        "socialProof",
        "flavorVariant",
        "uniqueSellingPoints",
        "visualIdentifiers",
      ],
    },
  };

  // Try Gemini call; if it fails (e.g. token limit), retry with smaller content
  let lastError: unknown;

  for (const tier of CONTENT_SIZE_TIERS) {
    // Skip tiers larger than what we fetched (no point re-fetching same size)
    if (tier > fetchedChars && fetchedChars > 0) continue;

    // Re-fetch with smaller limit if this isn't the first attempt
    if (tier < fetchedChars && fetchedChars > 0) {
      console.warn(
        `[gemini-reader] Retrying with ${tier} chars (previous attempt failed)`,
      );
      try {
        pageContent = await fetchPageContent(url, tier);
      } catch {
        break; // Can't re-fetch, give up
      }
    }

    const currentPrompt = `You are a marketing analyst and packaging expert. Analyze the following product page content and extract structured information with extreme precision.

SOURCE URL: ${url}

${pageContent}

CRITICAL EXTRACTION RULES:
1. brandName: Extract the EXACT brand name as displayed on the page (e.g. "Nutricost", "Optimum Nutrition"). Do NOT paraphrase or abbreviate.
2. productName: Extract the FULL product name exactly as shown (e.g. "Creatine Monohydrate Gummies", "Gold Standard 100% Whey"). Include flavor/variant if shown.
3. tagline: The brand or product tagline/slogan if present on the page. null if none found.
4. packagingForm: Describe the EXACT physical form of the product packaging based on context clues in the page (product type, images described, supplements facts). Be very specific:
   - Container type: "pouch/bag", "bottle/jar", "box", "tube", "sachet", "can", "tub"
   - Product form inside: "gummies", "capsules", "powder", "tablets", "liquid", "bars"
   - Example: "resealable stand-up pouch containing gummies", "white plastic tub with screw lid containing powder", "amber glass bottle containing capsules"
   This is NON-NEGOTIABLE — the image generator will use this to render the correct packaging shape.
5. physicalDimensions: Estimate the REAL-WORLD physical size of the product packaging based on product type, serving count, and weight mentioned on the page. Be specific:
   - Include estimated height, width, and depth in cm
   - Include a familiar size comparison (e.g. "about the size of a hand", "slightly larger than a smartphone", "coffee mug height")
   - Example for 60-count gummy pouch: "approximately 20cm tall × 14cm wide × 6cm deep — handheld size, similar to a small book"
   - Example for 2lb protein tub: "approximately 25cm tall × 15cm diameter — about the size of a small paint can"
   - Example for 60-capsule bottle: "approximately 12cm tall × 6cm diameter — fits in one hand, similar to a prescription bottle"
   If no weight/count info, estimate based on the product category. This is CRITICAL for the image generator to render correct proportions.
6. productFormDetails: Describe the INDIVIDUAL product items (the consumable inside the packaging) in detail:
   - Shape: exact shape (round, bear-shaped, oval, rectangular, etc.)
   - Size: estimated size of a single piece (e.g. "each gummy is ~2cm, roughly the size of a large vitamin")
   - Color: actual color(s) if mentioned or inferable
   - Texture: gummy/chewy, hard/crunchy, smooth, powdery, etc.
   - Example: "bear-shaped gummies, ~2cm each, orange/yellow color, soft chewy texture with sugar coating"
   - Example: "oblong capsules, ~2cm long, white/clear with visible powder inside"
   If product form is powder/liquid (no individual pieces), describe the texture/consistency instead.
7. claims: Array of EXACT product claims copied from the page text (e.g. "Clinically tested", "5g creatine per serving"). Do NOT invent claims — only extract what is actually written.
8. keyIngredients: Array of key ingredients actually mentioned on the page
9. benefits: Array of product benefits actually stated on the page
10. tone: The overall tone of the copy (e.g. "scientific", "warm", "bold", "premium")
11. targetSignals: Array of audience signals from the copy (who is this targeting?)
12. rawSummary: A 200-word summary focusing on what makes this product unique, using ONLY facts from the page content. Include specific numbers (dosage, serving count, price, certifications) when available. Write it as a marketing brief — cover the product's story, differentiation, and strongest selling angles.
13. priceInfo: Price and value proposition if mentioned on the page. Include regular price, sale price, per-serving cost, bundle pricing, subscription price. Example: "$24.99 (60 gummies, ~$0.42/serving), Subscribe & Save 15%". null if not found.
14. servingInfo: Serving details from supplement facts or product description. Include: servings per container, serving size, key dosage per serving. Example: "60 gummies per pouch, 2 gummies per serving (30 servings), 5g creatine monohydrate per serving". null if not found.
15. certifications: Array of ALL certifications, badges, seals, and trust signals mentioned on the page. Examples: "GMP Certified", "Third-Party Tested", "Made in USA", "Non-GMO", "Gluten Free", "Vegan", "FDA Registered Facility", "NSF Certified", "cGMP Compliant". Extract EVERY certification/badge — these are powerful ad copy elements.
16. socialProof: Social proof data from the page — star rating, review count, testimonial snippets, awards, "best seller" badges. Example: "4.7/5 stars (2,847 reviews), Amazon's Choice, #1 Best Seller in Sports Nutrition". null if not found.
17. flavorVariant: The specific flavor, color, or variant being viewed on this page. Example: "Mixed Berry flavor", "Unflavored", "Chocolate Peanut Butter, 2lb tub". null if not a flavored/variant product.
18. uniqueSellingPoints: Array of 3-5 unique selling points that differentiate this product from competitors. These should be specific, compelling, and directly from the page. Focus on: what makes this product DIFFERENT (not just good). Examples: "Only creatine gummy with 5g per serving", "Patented absorption technology", "60-day supply in one pouch". If nothing truly unique is stated, extract the strongest differentiating claims.
19. visualIdentifiers: A detailed description of the packaging's VISUAL APPEARANCE for the image generator to distinguish this product from any other. Describe:
   - **Dominant colors** of the packaging (e.g. "primarily black pouch with gold accents and orange stripe")
   - **Label layout** (e.g. "product name in large white text at top, brand logo centered, supplement facts on back")
   - **Distinctive visual elements** (e.g. "holographic seal on front", "transparent window showing gummies inside", "metallic gold cap")
   - **Shape silhouette** (e.g. "tall narrow bottle with tapered neck", "wide flat pouch with rounded bottom corners")
   - Example: "Matte black stand-up pouch with bold gold 'CREATINE' text across the center, orange horizontal stripe at bottom, white brand logo 'NUTRICOST' at top-left, clear window on lower-right showing orange gummies inside, resealable zip at top"
   This is CRITICAL — the image generator uses this to ensure it renders THIS EXACT product and not a generic or competitor product.

IMPORTANT: Only use information that is ACTUALLY PRESENT in the page content above. Do NOT hallucinate or invent product details. If information is not available, use empty arrays, null, or generic descriptions.`;

    try {
      const result = await geminiGenerate(
        userId,
        GEMINI_TEXT_MODEL,
        [{ text: currentPrompt }],
        8192,
        structuredOutput,
      );
      const parsed = safeJsonParse<ProductContext>(result);
      // Defensive: truncated JSON repair may drop array fields
      return {
        ...parsed,
        claims: parsed.claims ?? [],
        keyIngredients: parsed.keyIngredients ?? [],
        benefits: parsed.benefits ?? [],
        targetSignals: parsed.targetSignals ?? [],
        rawSummary: parsed.rawSummary ?? "",
        packagingForm: parsed.packagingForm ?? "unknown",
        physicalDimensions: parsed.physicalDimensions ?? "standard size for product category",
        productFormDetails: parsed.productFormDetails ?? "see attached product images",
        tone: parsed.tone ?? "neutral",
        brandName: parsed.brandName ?? "Unknown Brand",
        productName: parsed.productName ?? "Unknown Product",
        tagline: parsed.tagline ?? null,
        priceInfo: parsed.priceInfo ?? null,
        servingInfo: parsed.servingInfo ?? null,
        certifications: parsed.certifications ?? [],
        socialProof: parsed.socialProof ?? null,
        flavorVariant: parsed.flavorVariant ?? null,
        uniqueSellingPoints: parsed.uniqueSellingPoints ?? [],
        visualIdentifiers: parsed.visualIdentifiers ?? "see attached product images for visual reference",
      };
    } catch (err) {
      lastError = err;
      console.warn(
        `[gemini-reader] Gemini call failed with ~${pageContent.length} chars content: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// ─── Read Competitor Product Page ────────────────────────────────────────────

export async function readCompetitorProductPage(
  userId: string,
  url: string,
): Promise<CompetitorProductContext> {
  // Fetch the actual page content
  let pageContent: string;
  try {
    pageContent = await fetchPageContent(url);
    console.log(
      `[gemini-reader] Fetched competitor page content: ${pageContent.length} chars from ${url}`,
    );
  } catch (err) {
    console.warn(
      `[gemini-reader] Failed to fetch competitor page, falling back to URL-only: ${err instanceof Error ? err.message : String(err)}`,
    );
    pageContent = `[FAILED TO FETCH — analyze based on URL pattern only]\nURL: ${url}`;
  }

  const prompt = `You are a competitive analyst. Analyze the following competitor product page content and extract structured information.

SOURCE URL: ${url}

${pageContent}

Based on the ACTUAL page content above, return a JSON object with:
- competitorName: the competitor brand/product name as shown on the page
- claims: array of their actual product claims from the page text (do NOT invent claims)
- weaknesses: array of AI-identified positioning gaps or weaknesses compared to a challenger brand
- rawSummary: a 150-word summary of the competitor page using ONLY facts from the content

IMPORTANT: Only use information that is ACTUALLY PRESENT in the page content above. Do NOT hallucinate or invent details.`;

  const structuredOutput = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        competitorName: { type: Type.STRING },
        claims: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        rawSummary: { type: Type.STRING },
      },
      required: ["competitorName", "claims", "weaknesses", "rawSummary"],
    },
  };

  const result = await geminiGenerate(
    userId,
    GEMINI_TEXT_MODEL,
    [{ text: prompt }],
    4096,
    structuredOutput,
  );

  return safeJsonParse<CompetitorProductContext>(result);
}

// ─── Analyze Competitor Ad Image ─────────────────────────────────────────────

export async function analyzeCompetitorAdImage(
  userId: string,
  imageUrl: string,
): Promise<CompetitorAdAnalysis> {
  // Delegate to Claude Haiku — better vision accuracy + preserves Gemini quota
  return analyzeCompetitorAdImageClaude(userId, imageUrl);
}

// ─── Analyze Competitor Ad Image via Claude Haiku ───────────────────────────
// Offloads image analysis from Gemini to Claude to preserve Gemini quota.
// Same CompetitorAdAnalysis output — drop-in replacement for competitor_ref mode.

const CLAUDE_ANALYZE_PROMPT = `Analyze this ad image as an expert creative director. Return ONLY valid JSON (no markdown fences) with these exact fields:

{
  "adType": "traditional" | "stealth_native" | "ugc",
  "funnelStage": "unaware" | "problem_aware" | "solution_aware" | "product_aware",
  "productVisibility": "hero" | "prominent" | "supporting" | "incidental" | "absent",
  "stealthCategory": "ENV" | "FMT" | "STR" | "HUM" | null,
  "textDensity": "heavy" | "moderate" | "minimal" | "none",
  "brandingLevel": "strong" | "subtle" | "none",
  "layout": "element positions with % of canvas, be precise",
  "colorScheme": "all colors with hex codes and dominance %",
  "typographyStyle": "font weight, style, size hierarchy",
  "visualHierarchy": "eye flow: 1st, 2nd, 3rd attention points",
  "composition": "technique, negative space, depth, camera angle",
  "textPlacement": "text position relative to product and edges",
  "mood": "emotional tone in 3-5 words",
  "strengths": ["3-4 bullet points, under 15 words each"],
  "weaknesses": ["3-4 areas for improvement, under 15 words each"],
  "replicationGuide": "120-word blueprint: exact element positions (% from edges), lighting direction, background description, prop positions, camera angle. Must be detailed enough to recreate without seeing original.",
  "creativeConcept": "core creative strategy in 1-2 sentences",
  "productPresentation": "how product is shown: angle, lighting, context",
  "propsAndContext": "all objects and their positions relative to product",
  "textContent": "all visible text, exact wording",
  "authenticityScore": "1-10 how real it looks + brief reason",
  "improvementOpportunities": ["4-5 specific improvements"],
  "hasHumanElements": true/false,
  "humanDescription": "describe human elements if present, null if not"
}

Classification guide:
- traditional: designed ad with brand elements, product prominent, marketing text
- stealth_native: looks like everyday content, product incidental/background
- ugc: authentic user content, real person with product

Be PRECISE with spatial positions (% from edges), colors (hex codes), and descriptions. Concise but complete.`;

export async function analyzeCompetitorAdImageClaude(
  userId: string,
  imageUrl: string,
): Promise<CompetitorAdAnalysis> {
  const { resizeImageFromUrl } = await import("@/services/geminiClient");
  const imageData = await resizeImageFromUrl(imageUrl, 1024);

  console.log("[gemini-reader] Analyzing competitor ad via Claude Haiku...");

  const result = await claudeVisionAnalyze(
    userId,
    imageData.data,
    imageData.mimeType as "image/jpeg",
    CLAUDE_ANALYZE_PROMPT,
    4096,
  );

  const parsed = safeJsonParse<CompetitorAdAnalysis>(result);

  return {
    ...parsed,
    adType: parsed.adType ?? "traditional",
    funnelStage: parsed.funnelStage ?? "product_aware",
    productVisibility: parsed.productVisibility ?? "hero",
    stealthCategory: parsed.stealthCategory ?? null,
    textDensity: parsed.textDensity ?? "moderate",
    brandingLevel: parsed.brandingLevel ?? "strong",
    strengths: parsed.strengths ?? [],
    weaknesses: parsed.weaknesses ?? [],
    improvementOpportunities: parsed.improvementOpportunities ?? [],
  };
}
