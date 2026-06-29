// Server-only module — uses geminiClient (for concept generation) + claudeClient (for sheet analysis)
import {
  geminiGenerate,
  GEMINI_TEXT_MODEL,
  Type,
} from "@/services/geminiClient";
import { claudeTextGenerate } from "@/services/claudeClient";
import type { ProductContext, CompetitorProductContext } from "@/lib/gemini-reader";
import type { Concept } from "@/lib/concepts";
import { loadConceptPrompt } from "@/lib/concept-prompt-loader";
import { safeJsonParse } from "@/lib/json-utils";

export type { Concept } from "@/lib/concepts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompetitorContext {
  market: string;
  topHookPatterns: string[];
  dominantCompositions: string[];
  emotionalTriggers: string[];
  whitespaceOpportunities: string[];
  rawAnalysis: string;
  // Extended fields from deep analysis (optional, backward compatible)
  commonClaims?: string[];
  thingsToAvoid?: string[];
  marketTone?: string;
}

export interface ConceptDirective {
  headline: string;
  bodyText: string | null;
  visualDirection: string;
  emotionalHook: string;
  differentiator: string;
}

export interface AudienceProfile {
  title: string;
  pain: string | null;
  angle: string | null;
  emotion: string | null;
}

// ─── Language Labels ─────────────────────────────────────────────────────────

const LANGUAGE_LABELS_SKILLS: Record<string, string> = {
  de: "German (Deutsch)",
  fr: "French (Français)",
  es: "Spanish (Español)",
};

// ─── Hoisted Regex Patterns ──────────────────────────────────────────────────

const RE_VIEW_IMAGE = /,View Image,/g;
const RE_VIEW_LANDING = /,View Landing Page,/g;
const RE_DECORATIVE_UNICODE = /[\u{1D400}-\u{1D7FF}]/gu;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Sanitize CSV content for safe embedding in a Gemini prompt.
 * - Strip non-printable Unicode (fancy fonts, zero-width chars)
 * - Truncate each caption to 300 chars to avoid token bloat
 * - Remove "View Image" / "View Landing Page" placeholder columns
 */
function sanitizeCsvForPrompt(csv: string): string {
  return csv
    .split("\n")
    .map((line) => {
      // Remove columns that are just placeholders
      let cleaned = line
        .replace(RE_VIEW_IMAGE, ",")
        .replace(RE_VIEW_LANDING, ",");

      // Strip non-ASCII decorative Unicode (mathematical bold, italic, etc.)
      cleaned = cleaned.replace(RE_DECORATIVE_UNICODE, "");

      // Truncate very long fields (captions) — find last quoted field and cap it
      if (cleaned.length > 400) {
        cleaned = cleaned.substring(0, 400) + "...";
      }

      return cleaned;
    })
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

// ─── Analyze Competitor Sheet ────────────────────────────────────────────────

export async function analyzeCompetitorSheet(
  userId: string,
  market: string,
  sheetContent: string,
): Promise<CompetitorContext> {
  const sanitized = sanitizeCsvForPrompt(sheetContent);

  const prompt = `You are an elite Meta ads strategist and creative director analyzing top-performing competitor ads from the ${market} market. Your analysis will directly inform ad creation that must OUTPERFORM these competitors.

The data below is a CSV export from a competitive intelligence tool. Each row represents a top-performing Meta ad.
Columns: Rank, Product Name, Page Name, Duration (days), Follower Count, Steal-Worthy Score, Caption.

Key metrics to consider:
- Duration (days): How long the ad has been running. Longer duration = proven performer
- Steal-Worthy Score: 0-100 rating of creative quality and performance
- Follower Count: Brand size indicator
- Caption: The actual ad copy. Analyze hooks, angles, emotional triggers, and CTAs

DATA:
${sanitized}

Analyze ALL ads thoroughly with the mindset: "How do we create ads that are MORE scroll-stopping, MORE persuasive, and MORE visually compelling than ALL of these?"

Return a JSON object with:
- market: "${market}"
- topHookPatterns: top 5 hook patterns used across these ads. Be EXTREMELY specific with examples (e.g. "Leading with specific dosage claim like '5g creatine per serving' — used by 7/15 top ads" not just "ingredient hook"). Include what makes each pattern effective.
- dominantCompositions: most common visual composition patterns inferred from ad context (e.g. "product hero with ingredient scatter", "before/after split screen"). Include % prevalence and what makes each work.
- emotionalTriggers: dominant emotional triggers with specificity (e.g. "fear of missing out on gains — used via urgency timers and limited stock language", "trust through clinical validation — cited specific study numbers")
- whitespaceOpportunities: what is NOT being done by any competitor. Be EXTREMELY specific and actionable. These are the gaps a new brand should aggressively exploit to stand out. Each opportunity should be a clear creative direction.
- commonClaims: the most frequently repeated claims/stats across competitor ads. Our ads must either match these with our own verified data OR deliberately avoid them to differentiate.
- thingsToAvoid: overused patterns, clichés, and approaches that have become "noise" in this market. Using these would make our ads blend in rather than stand out.
- marketTone: the dominant tone/voice in this market (e.g. "aggressive/hype-driven", "clinical/evidence-based", "lifestyle/aspirational"). Understanding this helps us choose whether to match or contrast.
- rawAnalysis: a comprehensive 300-word analysis covering: (1) market positioning trends, (2) common CTA patterns, (3) audience targeting signals, (4) what the TOP 3 performers do differently from the rest, (5) specific strategic recommendations for creating ads that BEAT these competitors — not just match them

Focus on actionable insights that directly translate to SUPERIOR ad creative.

Return ONLY valid JSON (no markdown fences).`;

  const systemPrompt = "You are an elite Meta ads strategist analyzing competitor ads. Return ONLY valid JSON (no markdown fences).";

  const result = await claudeTextGenerate(
    userId,
    systemPrompt,
    prompt,
    8192,
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
    commonClaims: parsed.commonClaims ?? [],
    thingsToAvoid: parsed.thingsToAvoid ?? [],
    marketTone: parsed.marketTone ?? "",
    rawAnalysis: parsed.rawAnalysis ?? "",
  };
}

// ─── Apply Concept Skill ─────────────────────────────────────────────────────

export async function applyConceptSkill(
  userId: string,
  concept: Concept,
  productContext: ProductContext,
  competitorContext: CompetitorContext,
  competitorProductContext: CompetitorProductContext | null,
  targetAudience: AudienceProfile,
  brandName?: string,
  productDescription?: string | null,
  language?: string,
): Promise<ConceptDirective> {
  const competitorSection = competitorProductContext
    ? `\n- Competitor product: ${competitorProductContext.competitorName}\n  Claims: ${competitorProductContext.claims.join(", ")}\n  Weaknesses: ${competitorProductContext.weaknesses.join(", ")}`
    : "";

  // Load concept-specific creative strategy from PROMPT.md if available
  const conceptPrompt = await loadConceptPrompt(concept.id);
  const strategyContext = conceptPrompt?.prompt
    ? `\n\n## CONCEPT-SPECIFIC STRATEGY (follow these rules precisely)\n${conceptPrompt.prompt}`
    : "";

  const displayBrand = brandName || productContext.brandName;
  const displayProduct = productContext.productName;

  const prompt = `You are an elite creative director at a top-tier performance marketing agency, specializing in Meta static ads that convert. You combine data-driven copywriting with world-class visual design.${strategyContext}

## PRIMARY DATA SOURCE — SINGLE SOURCE OF TRUTH (MANDATORY)
ALL ad copy content MUST come EXCLUSIVELY from this section. Zero exceptions.
- Brand: ${displayBrand}
- Product: ${displayProduct}${productContext.flavorVariant ? `\n- Flavor/Variant: ${productContext.flavorVariant}` : ""}
- Summary: ${productContext.rawSummary}${productDescription ? `\n- Description: ${productDescription}` : ""}
- Packaging: ${productContext.packagingForm} (${productContext.physicalDimensions})
- Product form: ${productContext.productFormDetails}
- EXACT claims from product page: ${productContext.claims.length > 0 ? productContext.claims.join("; ") : "none found"}
- Key ingredients: ${productContext.keyIngredients.length > 0 ? productContext.keyIngredients.join(", ") : "none listed"}
- Benefits stated on page: ${productContext.benefits.length > 0 ? productContext.benefits.join("; ") : "none listed"}${productContext.servingInfo ? `\n- Serving info: ${productContext.servingInfo}` : ""}${productContext.priceInfo ? `\n- Price/Value: ${productContext.priceInfo}` : ""}${productContext.certifications.length > 0 ? `\n- Certifications & trust signals: ${productContext.certifications.join(", ")}` : ""}${productContext.socialProof ? `\n- Social proof: ${productContext.socialProof}` : ""}${productContext.uniqueSellingPoints.length > 0 ? `\n- Unique selling points: ${productContext.uniqueSellingPoints.join("; ")}` : ""}
- Tone: ${productContext.tone}
- Tagline: ${productContext.tagline ?? "none"}

## CONTENT INTEGRITY RULES (HIGHEST PRIORITY — ZERO TOLERANCE)
1. Every single word in headline and bodyText MUST be directly traceable to the PRIMARY DATA SOURCE above.
2. Use ONLY claims, ingredients, benefits, dosages, and numbers that EXPLICITLY appear in the product page data.
3. Do NOT invent, exaggerate, or embellish ANY statistic, dosage, percentage, or benefit.
4. Do NOT borrow, paraphrase, or adapt language, hooks, slogans, or claims from the MARKET CONTEXT or any competitor.
5. If a claim sounds impressive but is NOT in the product data — DO NOT USE IT. Period.
6. The headline must feel like it was written BY this brand, FOR this product — not a generic ad template.
7. Every benefit mentioned must be a REAL benefit from the product page. No aspirational claims beyond what the page states.

## MARKET INTELLIGENCE (for STRATEGIC POSITIONING only — NEVER for ad copy content)
Use this section to understand the competitive landscape so you can position our product DIFFERENTLY and MORE EFFECTIVELY. But NEVER copy or adapt competitor language, claims, hooks, or messaging into our ad.
- Market: ${competitorContext.market}
- Competitor hook patterns (what they all do — find gaps): ${competitorContext.topHookPatterns.join("; ")}
- Competitor compositions (avoid sameness): ${competitorContext.dominantCompositions.join("; ")}
- Emotional triggers competitors use: ${competitorContext.emotionalTriggers.join("; ")}
- Whitespace opportunities (unexploited gaps WE should own): ${competitorContext.whitespaceOpportunities.join("; ")}${competitorContext.thingsToAvoid?.length ? `\n- Overused patterns to AVOID completely: ${competitorContext.thingsToAvoid.join("; ")}` : ""}
- Market analysis: ${competitorContext.rawAnalysis}${competitorSection}

## STRATEGIC MANDATE: BEAT THE COMPETITION
Your ad must be MORE scroll-stopping, MORE persuasive, and MORE visually compelling than ANY competitor ad in this market.
- Study what competitors do well (hook patterns, compositions) → then do it BETTER with OUR product's real data
- Study competitor weaknesses and gaps → exploit them aggressively
- The visual design must feel PREMIUM — better production quality than anything in the market
- The headline must be sharper, more specific, and more emotionally resonant than generic competitor hooks

## AD BRIEF
- Concept: ${concept.label} — ${concept.description}
- Target audience: ${targetAudience.title}
  Pain: ${targetAudience.pain ?? "N/A"}
  Angle: ${targetAudience.angle ?? "N/A"}
  Emotion: ${targetAudience.emotion ?? "N/A"}

Generate a PREMIUM creative directive:
1. headline: under 12 words, scroll-stopping, pattern-interrupting. MUST reference "${displayBrand}" or "${displayProduct}". Use ONLY verified facts from PRIMARY DATA SOURCE. Must feel specific to THIS product — not a template that could work for any brand.
2. bodyText: optional supporting claim (under 6 words) or null. MUST be a real, verified claim/benefit/ingredient from the product page. If no strong supporting claim exists in the data, return null — do NOT invent one.
3. visualDirection: specific, detailed composition for the image generator. MUST reference the exact packaging "${productContext.packagingForm}" at correct real-world scale (${productContext.physicalDimensions}). Include product form details: ${productContext.productFormDetails}. Describe camera angle, lighting setup, background treatment, prop arrangement, and spatial hierarchy. The visual must be MORE polished and premium than typical competitor ads in this market.
4. emotionalHook: the precise, visceral feeling the viewer should have within 0.5 seconds of seeing this ad. Be specific — not just "trust" but HOW trust manifests (e.g., "instant credibility from clinical-grade presentation")
5. differentiator: what makes this ad impossible to confuse with any competitor — based on OUR product's unique real strengths from the data above${language && !language.startsWith("en") ? `\n\nLANGUAGE: Write headline and bodyText in ${LANGUAGE_LABELS_SKILLS[language] ?? language}. Write NATIVELY — not translated from English. The copy must sound like it was written by a native speaker, not translated. Brand/product names stay in original form.` : ""}

Return as JSON.`;

  const structuredOutput = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        bodyText: { type: Type.STRING, nullable: true },
        visualDirection: { type: Type.STRING },
        emotionalHook: { type: Type.STRING },
        differentiator: { type: Type.STRING },
      },
      required: [
        "headline",
        "visualDirection",
        "emotionalHook",
        "differentiator",
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

  return safeJsonParse<ConceptDirective>(result);
}

// ─── Apply Concept Skill — Multiple Variants ────────────────────────────────

/**
 * Generate multiple unique ConceptDirectives for the same concept in a single call.
 * Each variant will have different headline, bodyText, emotionalHook, etc.
 * All content is derived from the actual product page data — nothing invented.
 */
export async function applyConceptSkillVariants(
  userId: string,
  concept: Concept,
  productContext: ProductContext,
  competitorContext: CompetitorContext,
  competitorProductContext: CompetitorProductContext | null,
  targetAudience: AudienceProfile,
  variantCount: number,
  brandName?: string,
  productDescription?: string | null,
  language?: string,
): Promise<ConceptDirective[]> {
  // For a single variant, fall back to the original function
  if (variantCount <= 1) {
    const single = await applyConceptSkill(
      userId, concept, productContext, competitorContext,
      competitorProductContext, targetAudience, brandName, productDescription, language,
    );
    return [single];
  }

  const competitorSection = competitorProductContext
    ? `\n- Competitor product: ${competitorProductContext.competitorName}\n  Claims: ${competitorProductContext.claims.join(", ")}\n  Weaknesses: ${competitorProductContext.weaknesses.join(", ")}`
    : "";

  const conceptPrompt = await loadConceptPrompt(concept.id);
  const strategyContext = conceptPrompt?.prompt
    ? `\n\n## CONCEPT-SPECIFIC STRATEGY (follow these rules precisely)\n${conceptPrompt.prompt}`
    : "";

  const displayBrand = brandName || productContext.brandName;
  const displayProduct = productContext.productName;

  const prompt = `You are an elite creative director at a top-tier performance marketing agency. You're creating a batch of ${variantCount} PREMIUM Meta static ad variants that must ALL be winners — at least 70-80% of variants must be good enough to run in production.${strategyContext}

## PRIMARY DATA SOURCE — SINGLE SOURCE OF TRUTH (MANDATORY)
ALL ad copy content MUST come EXCLUSIVELY from this section. Zero exceptions.
- Brand: ${displayBrand}
- Product: ${displayProduct}${productContext.flavorVariant ? `\n- Flavor/Variant: ${productContext.flavorVariant}` : ""}
- Summary: ${productContext.rawSummary}${productDescription ? `\n- Description: ${productDescription}` : ""}
- Packaging: ${productContext.packagingForm} (${productContext.physicalDimensions})
- Product form: ${productContext.productFormDetails}
- EXACT claims from product page: ${productContext.claims.length > 0 ? productContext.claims.join("; ") : "none found"}
- Key ingredients: ${productContext.keyIngredients.length > 0 ? productContext.keyIngredients.join(", ") : "none listed"}
- Benefits stated on page: ${productContext.benefits.length > 0 ? productContext.benefits.join("; ") : "none listed"}${productContext.servingInfo ? `\n- Serving info: ${productContext.servingInfo}` : ""}${productContext.priceInfo ? `\n- Price/Value: ${productContext.priceInfo}` : ""}${productContext.certifications.length > 0 ? `\n- Certifications & trust signals: ${productContext.certifications.join(", ")}` : ""}${productContext.socialProof ? `\n- Social proof: ${productContext.socialProof}` : ""}${productContext.uniqueSellingPoints.length > 0 ? `\n- Unique selling points: ${productContext.uniqueSellingPoints.join("; ")}` : ""}
- Tone: ${productContext.tone}
- Tagline: ${productContext.tagline ?? "none"}

## CONTENT INTEGRITY RULES (HIGHEST PRIORITY — ZERO TOLERANCE)
1. Every single word in headline and bodyText MUST be directly traceable to the PRIMARY DATA SOURCE above.
2. Use ONLY claims, ingredients, benefits, dosages, and numbers that EXPLICITLY appear in the product page data.
3. Do NOT invent, exaggerate, or embellish ANY statistic, dosage, percentage, or benefit.
4. Do NOT borrow, paraphrase, or adapt language, hooks, or claims from competitor data.
5. If a claim sounds impressive but is NOT in the product data — DO NOT USE IT.
6. Every headline must feel like it was written specifically for THIS product — not a template.

## MARKET INTELLIGENCE (for STRATEGIC POSITIONING only — NEVER for ad copy)
Use this to understand the landscape and differentiate. NEVER copy competitor messaging.
- Market: ${competitorContext.market}
- Competitor patterns (avoid sameness): ${competitorContext.topHookPatterns.join("; ")}
- Competitor compositions: ${competitorContext.dominantCompositions.join("; ")}
- Emotional triggers in market: ${competitorContext.emotionalTriggers.join("; ")}
- Whitespace opportunities to exploit: ${competitorContext.whitespaceOpportunities.join("; ")}${competitorContext.thingsToAvoid?.length ? `\n- Overused patterns to AVOID: ${competitorContext.thingsToAvoid.join("; ")}` : ""}
- Market analysis: ${competitorContext.rawAnalysis}${competitorSection}

## STRATEGIC MANDATE: EVERY VARIANT MUST BE A WINNER
Your ${variantCount} variants must ALL be production-quality. The goal is that 7-8 out of 10 variants are immediately usable. To achieve this:
- Each variant must exploit a DIFFERENT whitespace opportunity or competitive gap
- Each variant must be visually distinctive enough that a viewer would not confuse any two
- Quality must be CONSISTENT — no "filler" variants. Every variant deserves the same creative effort.
- Study what the top-performing competitor ads do well, then do it BETTER with our real product data

## AD BRIEF
- Concept: ${concept.label} — ${concept.description}
- Target audience: ${targetAudience.title}
  Pain: ${targetAudience.pain ?? "N/A"}
  Angle: ${targetAudience.angle ?? "N/A"}
  Emotion: ${targetAudience.emotion ?? "N/A"}

Generate EXACTLY ${variantCount} PREMIUM ad creative variants for the "${concept.label}" concept.

## VARIANT DIVERSITY MATRIX (MANDATORY — each variant MUST differ on ALL axes)
Use the following creative axes to ensure maximum diversity. Each variant should occupy a UNIQUE position across these dimensions:

### Axis 1: HEADLINE ANGLE (each variant = different product angle)
Map out ${variantCount} different angles from the product data: different claims, different ingredients, different benefits, different use cases, different emotional triggers. NO two variants may use the same angle.

### Axis 2: EMOTIONAL HOOK (each variant = different emotion)
Cycle through: curiosity → trust → urgency → aspiration → belonging → transformation → relief → excitement → pride → empowerment. Each variant must target a DIFFERENT primary emotion.

### Axis 3: VISUAL COMPOSITION (each variant = different layout)
Alternate between: hero product center → split frame → diagonal dynamic → minimalist → editorial → lifestyle context → ingredient spotlight → before/after implied → scale contrast → macro detail. Each variant must use a DIFFERENT composition strategy.

### Axis 4: DESIGN QUALITY (non-negotiable for ALL variants)
Every variant must:
- Feel premium and polished — like a $10K agency production
- Have a clear visual hierarchy: eye → headline → product → CTA flow
- Use the product at correct real-world scale (${productContext.physicalDimensions})
- Reference exact packaging: ${productContext.packagingForm}
- Include product form details: ${productContext.productFormDetails}
- Be MORE visually compelling than typical competitor ads in the ${competitorContext.market} market

### ANTI-SAMENESS CHECK (self-verify before responding)
Before finalizing, verify: if you showed all ${variantCount} variants side-by-side, would each one feel like a DISTINCT creative execution? If any two feel similar, rework the weaker one.${language && !language.startsWith("en") ? `\n\n### LANGUAGE: Write ALL headlines and bodyText in ${LANGUAGE_LABELS_SKILLS[language] ?? language}. Write NATIVELY — not translated from English. Brand/product names stay in original form.` : ""}

For each variant:
1. headline: under 12 words, scroll-stopping, pattern-interrupting. MUST reference "${displayBrand}" or "${displayProduct}". Uses ONLY verified product claims. Must feel specific to THIS product.
2. bodyText: optional supporting claim (under 6 words) from product page, or null. Only include if a strong, real claim exists — otherwise null.
3. visualDirection: detailed composition with camera angle, lighting, background, prop arrangement, spatial hierarchy. Product at correct scale. Must be specific enough for an image generator to execute precisely.
4. emotionalHook: the precise, visceral feeling within 0.5 seconds. Be specific about HOW the emotion manifests visually.
5. differentiator: what makes THIS specific variant impossible to confuse with any other variant or any competitor ad

Return as a JSON object with a "variants" array containing exactly ${variantCount} directive objects.`;

  const structuredOutput = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        variants: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              bodyText: { type: Type.STRING, nullable: true },
              visualDirection: { type: Type.STRING },
              emotionalHook: { type: Type.STRING },
              differentiator: { type: Type.STRING },
            },
            required: [
              "headline",
              "visualDirection",
              "emotionalHook",
              "differentiator",
            ],
          },
        },
      },
      required: ["variants"],
    },
  };

  const result = await geminiGenerate(
    userId,
    GEMINI_TEXT_MODEL,
    [{ text: prompt }],
    8192,
    structuredOutput,
  );

  const parsed = safeJsonParse<{ variants: ConceptDirective[] }>(result);
  const variants = parsed.variants;
  if (!Array.isArray(variants) || variants.length === 0) {
    console.warn("[concept-skills] Gemini returned no variants, falling back to single variant");
    const single = await applyConceptSkill(
      userId, concept, productContext, competitorContext,
      competitorProductContext, targetAudience, brandName, productDescription, language,
    );
    return [single];
  }
  return variants.slice(0, variantCount);
}
