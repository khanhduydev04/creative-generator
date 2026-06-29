// Server-only module — deep analysis of competitor ads via Claude Haiku (vision)
// + Gemini (text synthesis)
import {
  geminiGenerate,
  resizeImageForApi,
  GEMINI_TEXT_MODEL,
  Type,
} from "@/services/geminiClient";
import { claudeVisionAnalyze, claudeTextGenerate } from "@/services/claudeClient";
import { safeJsonParse } from "@/lib/json-utils";
import type { CompetitorAdRow } from "@/lib/sheets-reader";
import type { CompetitorContext } from "@/lib/concept-skills";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdImageAnalysis {
  productName: string;
  composition: string;
  hookType: string;
  colorPalette: string[];
  textElements: string | null;
  emotionalTrigger: string;
}

export interface LandingPageInsight {
  productName: string;
  mainClaim: string;
  positioning: string;
  tone: string;
  cta: string;
  socialProof: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RATE_LIMIT_DELAY_MS = 500;
const IMAGE_FETCH_TIMEOUT_MS = 10_000;
const MAX_ROWS_TO_ANALYZE = 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      IMAGE_FETCH_TIMEOUT_MS,
    );

    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

// ─── Step A: Analyze Ad Images ───────────────────────────────────────────────

async function analyzeAdImage(
  userId: string,
  imageUrl: string,
  productName: string,
): Promise<AdImageAnalysis | null> {
  const imageBuffer = await fetchImageAsBuffer(imageUrl);
  if (!imageBuffer) {
    console.warn(
      `[competitor-analyzer] Could not fetch image for "${productName}"`,
    );
    return null;
  }

  const { data, mimeType } = await resizeImageForApi(imageBuffer);

  const prompt = `Analyze this Meta ad image for a product called "${productName}".

Return ONLY valid JSON (no markdown fences) with:
- composition: describe the visual layout (e.g. "product centered with text overlay top-left, gradient background")
- hookType: what visual hook is used to stop the scroll (e.g. "bold data claim", "before/after split", "product hero close-up")
- colorPalette: array of 3-5 dominant hex color codes visible in the ad
- textElements: any text/headline visible on the ad image, or null if no text
- emotionalTrigger: the primary emotion this ad targets (e.g. "trust", "urgency", "aspiration")`;

  try {
    const result = await claudeVisionAnalyze(
      userId,
      data,
      mimeType as "image/jpeg",
      prompt,
      1024,
    );

    const parsed = safeJsonParse<Omit<AdImageAnalysis, "productName">>(result);
    return { productName, ...parsed };
  } catch (err) {
    console.warn(
      `[competitor-analyzer] Image analysis failed for "${productName}": ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

// ─── Step B: Analyze Landing Pages ───────────────────────────────────────────

async function analyzeLandingPage(
  userId: string,
  url: string,
  productName: string,
): Promise<LandingPageInsight | null> {
  const systemPrompt = "You are a competitive analyst extracting marketing intelligence from competitor landing pages. Return ONLY valid JSON (no markdown fences).";

  const userMessage = `Analyze this competitor landing page and extract marketing intelligence.

URL: ${url}
Product: ${productName}

Return a JSON object with:
- mainClaim: the primary product claim or value proposition
- positioning: how the product is positioned in the market (e.g. "premium science-backed", "budget-friendly convenience")
- tone: the overall copy tone (e.g. "scientific authority", "casual friendly", "urgent sales-driven")
- cta: the primary call-to-action text
- socialProof: any social proof elements (reviews count, testimonials, badges), or null if none`;

  try {
    const result = await claudeTextGenerate(
      userId,
      systemPrompt,
      userMessage,
      1024,
    );

    const parsed = safeJsonParse<Omit<LandingPageInsight, "productName">>(
      result,
    );
    return { productName, ...parsed };
  } catch (err) {
    console.warn(
      `[competitor-analyzer] Landing page analysis failed for "${productName}": ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

// ─── Step C: Synthesize All Findings ─────────────────────────────────────────

async function synthesizeFindings(
  userId: string,
  market: string,
  rows: CompetitorAdRow[],
  imageAnalyses: AdImageAnalysis[],
  pageInsights: LandingPageInsight[],
): Promise<CompetitorContext> {
  // Build caption summary (sanitized)
  const captionSummary = rows
    .slice(0, MAX_ROWS_TO_ANALYZE)
    .map((r) => {
      const caption =
        r.caption.length > 300
          ? r.caption.substring(0, 300) + "..."
          : r.caption;
      return `[${r.rank}] ${r.productName} (${r.durationDays}d, ${r.wowScore}): ${caption}`;
    })
    .join("\n");

  const imageSection =
    imageAnalyses.length > 0
      ? `\n\nVISUAL ANALYSIS (${imageAnalyses.length} ads analyzed):\n${imageAnalyses
          .map(
            (a) =>
              `- ${a.productName}: ${a.composition} | Hook: ${a.hookType} | Colors: ${a.colorPalette.join(", ")} | Emotion: ${a.emotionalTrigger}${a.textElements ? ` | Text: "${a.textElements}"` : ""}`,
          )
          .join("\n")}`
      : "";

  const pageSection =
    pageInsights.length > 0
      ? `\n\nLANDING PAGE ANALYSIS (${pageInsights.length} pages analyzed):\n${pageInsights
          .map(
            (p) =>
              `- ${p.productName}: Claim="${p.mainClaim}" | Position: ${p.positioning} | Tone: ${p.tone} | CTA: "${p.cta}"${p.socialProof ? ` | Proof: ${p.socialProof}` : ""}`,
          )
          .join("\n")}`
      : "";

  const prompt = `You are a senior Meta ads strategist. Synthesize the following competitor intelligence for the ${market} market.

AD CAPTIONS (${rows.length} top-performing ads):
${captionSummary}${imageSection}${pageSection}

Based on ALL data above, return a JSON object with:
- market: "${market}"
- topHookPatterns: top 5 hook patterns. Be specific (e.g. "Leading with specific dosage claim like 5g creatine per serving")
- dominantCompositions: most common visual layouts and compositions
- emotionalTriggers: primary emotions targeted across ads
- commonClaims: most repeated product claims across ads and landing pages
- whitespaceOpportunities: what NO competitor is doing. Specific, actionable gaps
- thingsToAvoid: overused patterns that would make a new ad blend in rather than stand out
- marketTone: overall tone of the market (1-2 sentences)
- rawAnalysis: comprehensive 300-word strategic analysis covering trends, opportunities, and recommendations for a NEW brand to beat these competitors`;

  const structuredOutput = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        market: { type: Type.STRING },
        topHookPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
        dominantCompositions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        emotionalTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
        commonClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
        whitespaceOpportunities: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        thingsToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
        marketTone: { type: Type.STRING },
        rawAnalysis: { type: Type.STRING },
      },
      required: [
        "market",
        "topHookPatterns",
        "dominantCompositions",
        "emotionalTriggers",
        "commonClaims",
        "whitespaceOpportunities",
        "thingsToAvoid",
        "marketTone",
        "rawAnalysis",
      ],
    },
  };

  const result = await geminiGenerate(
    userId,
    GEMINI_TEXT_MODEL,
    [{ text: prompt }],
    4096,
    structuredOutput,
  );

  const parsed = safeJsonParse<CompetitorContext>(result);
  // Defensive: truncated JSON repair may drop array fields
  return {
    ...parsed,
    market: parsed.market ?? market,
    topHookPatterns: parsed.topHookPatterns ?? [],
    dominantCompositions: parsed.dominantCompositions ?? [],
    emotionalTriggers: parsed.emotionalTriggers ?? [],
    whitespaceOpportunities: parsed.whitespaceOpportunities ?? [],
    rawAnalysis: parsed.rawAnalysis ?? "",
    commonClaims: parsed.commonClaims ?? [],
    thingsToAvoid: parsed.thingsToAvoid ?? [],
    marketTone: parsed.marketTone ?? "",
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Deep-analyze competitor ads: images (Gemini Vision) + landing pages + captions.
 * Processes sequentially with 500ms delay between Gemini calls.
 * Skips broken rows gracefully — never stops the entire analysis.
 */
export async function analyzeCompetitorAds(
  userId: string,
  rows: CompetitorAdRow[],
  market: string,
): Promise<CompetitorContext> {
  const toAnalyze = rows.slice(0, MAX_ROWS_TO_ANALYZE);
  const total = toAnalyze.length;
  const skipped: string[] = [];

  console.log(
    `[competitor-analyzer] Starting analysis of ${total} ads for market ${market}`,
  );

  // Step A: Analyze ad images
  const imageAnalyses: AdImageAnalysis[] = [];
  for (let i = 0; i < toAnalyze.length; i++) {
    const row = toAnalyze[i];
    if (!row.imageUrl) {
      console.log(
        `[competitor-analyzer] Row ${i + 1}/${total} — ${row.productName}: image: ⏭ (no URL)`,
      );
      continue;
    }

    console.log(
      `[competitor-analyzer] Analyzing image ${i + 1}/${total}: ${row.productName}`,
    );
    const analysis = await analyzeAdImage(userId, row.imageUrl, row.productName);
    if (analysis) {
      imageAnalyses.push(analysis);
      console.log(
        `[competitor-analyzer] Row ${i + 1}/${total} — ${row.productName}: image: ✅`,
      );
    } else {
      skipped.push(`${row.productName} (image)`);
      console.log(
        `[competitor-analyzer] Row ${i + 1}/${total} — ${row.productName}: image: ❌ skipped`,
      );
    }

    await sleep(RATE_LIMIT_DELAY_MS);
  }

  // Step B: Analyze landing pages
  const pageInsights: LandingPageInsight[] = [];
  for (let i = 0; i < toAnalyze.length; i++) {
    const row = toAnalyze[i];
    if (!row.landingPageUrl) {
      console.log(
        `[competitor-analyzer] Row ${i + 1}/${total} — ${row.productName}: website: ⏭ (no URL)`,
      );
      continue;
    }

    console.log(
      `[competitor-analyzer] Analyzing website ${i + 1}/${total}: ${row.productName}`,
    );
    const insight = await analyzeLandingPage(
      userId,
      row.landingPageUrl,
      row.productName,
    );
    if (insight) {
      pageInsights.push(insight);
      console.log(
        `[competitor-analyzer] Row ${i + 1}/${total} — ${row.productName}: website: ✅`,
      );
    } else {
      skipped.push(`${row.productName} (website)`);
      console.log(
        `[competitor-analyzer] Row ${i + 1}/${total} — ${row.productName}: website: ❌ skipped`,
      );
    }

    await sleep(RATE_LIMIT_DELAY_MS);
  }

  // Step C: Synthesize all findings
  console.log(
    `[competitor-analyzer] Synthesizing: ${imageAnalyses.length} images, ${pageInsights.length} pages analyzed. ${skipped.length} skipped.`,
  );

  const context = await synthesizeFindings(
    userId,
    market,
    toAnalyze,
    imageAnalyses,
    pageInsights,
  );

  console.log(
    `[competitor-analyzer] Analyzed ${total - skipped.length}/${total} rows (${skipped.length} skipped)`,
  );

  return context;
}
