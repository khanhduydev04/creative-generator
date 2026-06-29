// Server-only module — Content adaptation via Claude Haiku API.
//
// Two modes:
// - "text-only": Rewrites sample content with product data (concept / competitor ref standard)
// - "vision":    Analyzes ad image + rewrites content to match visual context (stealth flows)

import {
  claudeTextGenerate,
  claudeVisionAnalyze,
} from "@/services/claudeClient";
import { fetchAndResizeImage } from "@/lib/image-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductDataForAdapt {
  brandName: string;
  productName: string;
  claims: string[];
  benefits: string[];
  keyIngredients: string[];
  tone: string;
  tagline?: string;
  // Extended fields — optional for backward compat, but provide richer context
  packagingForm?: string;
  physicalDimensions?: string;
  productFormDetails?: string;
  targetSignals?: string[];
  rawSummary?: string;
  priceInfo?: string | null;
  servingInfo?: string | null;
  certifications?: string[];
  socialProof?: string | null;
  flavorVariant?: string | null;
  uniqueSellingPoints?: string[];
  visualIdentifiers?: string;
}

export interface ContentAdaptInput {
  /** Generated ad image URL — required for vision mode, ignored for text-only */
  adImageUrl?: string;
  /** Competitor/sample content to rewrite */
  sampleContent: string;
  /** Product data to ground all claims */
  productData: ProductDataForAdapt;
  /** Target language for the output */
  language: string;
  /** "text-only" for standard flows, "vision" for stealth flows */
  mode: "text-only" | "vision";
}

export interface AdaptedContent {
  /** Main social media caption */
  caption: string;
  /** Organic hashtags (no # prefix stored — add when rendering) */
  hashtags: string[];
  /** Soft call-to-action */
  callToAction: string;
}

// ─── System Prompts ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT_TEXT_ONLY = `You are a social media content strategist. Your job is to rewrite competitor ad content for a different product while preserving the structure, tone, hooks, and emotional triggers of the original.

ABSOLUTE RULES:
1. ALL product claims, benefits, ingredients, and pricing MUST come from the provided product data. ZERO invention.
2. Preserve the EXACT structure of the sample content: line count, line breaks, emoji usage pattern, hashtag density.
3. Match the tone: if casual/conversational, yours must be too. If clinical/scientific, maintain that.
4. The content must feel like it was written by a real person sharing their genuine experience.
5. Never use words like "ad", "sponsored", "partner", "promotion", or any disclosure language.
6. If the sample uses specific sentence patterns (questions, exclamations, ellipsis), mirror them.
7. Replace competitor product references with the client's product naturally — don't just swap names.
8. Use pricing, certifications, and social proof from product data when the sample content includes similar elements.

OUTPUT FORMAT — respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "caption": "the full adapted caption text",
  "hashtags": ["tag1", "tag2", "tag3"],
  "callToAction": "soft CTA text"
}`;

const SYSTEM_PROMPT_VISION = `You are a stealth content strategist specializing in native advertising. You analyze ad images and adapt competitor content to match both the visual context and the client's product data.

ABSOLUTE RULES:
1. First, analyze the ad image: What does the viewer see? What's the scene, mood, and context?
2. ALL product claims, benefits, ingredients, and pricing MUST come from the provided product data. ZERO invention.
3. The adapted content must feel NATURAL for the scene depicted in the image.
4. Preserve the EXACT structure of the sample content: line count, line breaks, emoji usage pattern, hashtag density.
5. Match the tone: casual and authentic, as if posted by a real person — not a marketer.
6. Never use words like "ad", "sponsored", "partner", "promotion", or any disclosure language.
7. If the image shows a lifestyle scene, the content should read like a genuine life update.
8. If the image shows a product in a natural setting, reference the setting organically.
9. Replace competitor product references with the client's product naturally.
10. Use pricing, certifications, and social proof from product data when the sample content includes similar elements.

OUTPUT FORMAT — respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "caption": "the full adapted caption text",
  "hashtags": ["tag1", "tag2", "tag3"],
  "callToAction": "soft CTA text"
}`;

// ─── Core Adaptation ─────────────────────────────────────────────────────────

/**
 * Adapt a single piece of content using Claude Haiku.
 * In text-only mode, works purely from text. In vision mode, also analyzes the ad image.
 */
export async function adaptContent(
  userId: string,
  input: ContentAdaptInput,
): Promise<AdaptedContent> {
  const { sampleContent, productData, language, mode, adImageUrl } = input;

  const productBlock = buildProductBlock(productData);
  const languageNote =
    language && language.toLowerCase() !== "english"
      ? `\n\nIMPORTANT: Write ALL output text in ${language}. The caption, hashtags, and CTA must be in ${language} — not English.`
      : "";

  const userText = `SAMPLE CONTENT TO ADAPT:
${sampleContent}

PRODUCT DATA:
${productBlock}${languageNote}

Analyze the sample content's structure, tone, and hooks. Then rewrite it for the product above, grounding every claim in the product data. Return JSON only.`;

  const systemPrompt =
    mode === "vision" ? SYSTEM_PROMPT_VISION : SYSTEM_PROMPT_TEXT_ONLY;

  let raw: string;

  if (mode === "vision" && adImageUrl) {
    // Vision mode — fetch image, resize, send to Claude with both system + user prompt
    const imageBuffer = await fetchAndResizeImage(adImageUrl, 1024);
    const base64 = imageBuffer.toString("base64");
    raw = await claudeVisionAnalyze(
      userId,
      base64,
      "image/jpeg",
      `${systemPrompt}\n\n${userText}`,
      4096,
    );
  } else {
    // Text-only mode
    raw = await claudeTextGenerate(userId, systemPrompt, userText, 4096);
  }

  return parseAdaptedContent(raw);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildProductBlock(data: ProductDataForAdapt): string {
  const lines: string[] = [
    `Brand: ${data.brandName}`,
    `Product: ${data.productName}`,
  ];
  if (data.tagline) lines.push(`Tagline: ${data.tagline}`);
  if (data.flavorVariant) lines.push(`Flavor/Variant: ${data.flavorVariant}`);
  if (data.packagingForm) lines.push(`Packaging: ${data.packagingForm}`);
  if (data.productFormDetails) lines.push(`Form Details: ${data.productFormDetails}`);
  if (data.claims.length > 0)
    lines.push(`Claims: ${data.claims.join("; ")}`);
  if (data.benefits.length > 0)
    lines.push(`Benefits: ${data.benefits.join("; ")}`);
  if (data.keyIngredients.length > 0)
    lines.push(`Key Ingredients: ${data.keyIngredients.join("; ")}`);
  if (data.uniqueSellingPoints && data.uniqueSellingPoints.length > 0)
    lines.push(`Unique Selling Points: ${data.uniqueSellingPoints.join("; ")}`);
  if (data.priceInfo) lines.push(`Pricing: ${data.priceInfo}`);
  if (data.servingInfo) lines.push(`Serving Info: ${data.servingInfo}`);
  if (data.certifications && data.certifications.length > 0)
    lines.push(`Certifications: ${data.certifications.join("; ")}`);
  if (data.socialProof) lines.push(`Social Proof: ${data.socialProof}`);
  if (data.tone) lines.push(`Tone: ${data.tone}`);
  if (data.targetSignals && data.targetSignals.length > 0)
    lines.push(`Target Audience Signals: ${data.targetSignals.join("; ")}`);
  if (data.rawSummary) lines.push(`Product Summary: ${data.rawSummary}`);
  return lines.join("\n");
}

/**
 * Parse Claude's JSON response into AdaptedContent.
 * Handles potential markdown fences and malformed JSON gracefully.
 */
function parseAdaptedContent(raw: string): AdaptedContent {
  // Strip markdown fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      caption: typeof parsed.caption === "string" ? parsed.caption : cleaned,
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.map((h) => String(h).replace(/^#/, ""))
        : [],
      callToAction:
        typeof parsed.callToAction === "string" ? parsed.callToAction : "",
    };
  } catch {
    // If JSON parsing fails, use the raw text as caption
    console.warn(
      "[content-adapter] Failed to parse Claude response as JSON, using raw text.",
    );
    return {
      caption: raw.trim(),
      hashtags: [],
      callToAction: "",
    };
  }
}
