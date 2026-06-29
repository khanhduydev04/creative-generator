import type { ConceptDirective, AudienceProfile } from "@/lib/concept-skills";
import type { ProductContext, CompetitorAdAnalysis } from "@/lib/gemini-reader";
import type { ConceptPrompt } from "@/lib/concept-prompt-loader";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdCopyOverride {
  headline?: string;
  bodyText?: string;
  additionalNotes?: string;
}

export interface BrandProfile {
  brandName: string;
  logoUrl: string | null;
  primaryColor1: string;
  primaryColor2: string;
  secondaryColor1: string;
  secondaryColor2: string;
  accentColor1: string;
  accentColor2: string;
  typography: string;
}

export interface OutputConfig {
  aspectRatio: string;
  resolution: string;
  funnelStage: string;
  count: number;
  variantIndex: number;
}

// ─── Assemble Prompt ─────────────────────────────────────────────────────────

export function assemblePrompt(
  conceptDirective: ConceptDirective,
  productContext: ProductContext,
  brandProfile: BrandProfile,
  targetAudience: AudienceProfile,
  outputConfig: OutputConfig,
  conceptPrompt: ConceptPrompt | null,
  productName?: string,
  productDescription?: string | null,
  adCopyOverride?: AdCopyOverride,
  productImageCount?: number,
  language?: string,
  imageLayoutInfo?: { hasBrandLogo: boolean; conceptRefCount: number },
): string {
  const displayName = productName || productContext.productName;
  const brandDisplayName = brandProfile.brandName || productContext.brandName;

  // Build mandatory ad copy override block (placed BEFORE everything for highest priority)
  const adCopyBlock = buildAdCopyBlock(adCopyOverride);

  // Build product description block with rich detail
  const productDescriptionBlock = buildProductDescriptionBlock(
    displayName,
    productContext,
    productDescription,
  );

  // Build concept visual direction + selected layout variant as ONE unified design section
  const designSection = buildDesignSection(conceptPrompt, outputConfig, productContext.visualIdentifiers);

  // Build language instruction (only for non-English languages)
  const languageBlock = buildLanguageInstruction(language);

  return `${adCopyBlock}${languageBlock}
TASK: Generate 1 static ${outputConfig.funnelStage} ad at ${outputConfig.aspectRatio}, ${outputConfig.resolution}. Meta feed — scroll-stopping, agency-quality.

## PRODUCT (READ FIRST — #1 PRIORITY)
The product in the ad MUST be an exact copy of the attached product photo (Image 1):
- **OUR product looks like**: ${productContext.visualIdentifiers}
- **Shape**: ${productContext.packagingForm} — keep this EXACT form
- **Labels**: Reproduce ALL text, graphics, logos on the packaging exactly as shown
- **Scale**: ${productContext.physicalDimensions} — real-world size, NOT enlarged to fill canvas
- **Material**: Match the exact finish — matte/glossy, foil, crinkle marks, label texture
- If reference/concept images show a DIFFERENT product — ignore it, only use Image 1

${buildImagePrioritySection(imageLayoutInfo ? {
    productImageCount: productImageCount ?? 1,
    hasBrandLogo: imageLayoutInfo.hasBrandLogo,
    conceptRefCount: imageLayoutInfo.conceptRefCount,
  } : productImageCount ?? 1)}

## BRAND
Brand: "${brandDisplayName}" | Product: "${displayName}" | Font: "${brandProfile.typography}"
Logo: NEVER generate, invent, or create any brand logo from scratch. If a brand logo image is attached (see Image Map below), reproduce it EXACTLY as-is — zero modifications, zero redesign, zero creative alterations. If no logo image is attached, the ONLY logo allowed is the one already printed on the product packaging.
Colors — Primary: ${brandProfile.primaryColor1} / ${brandProfile.primaryColor2} | Secondary: ${brandProfile.secondaryColor1} / ${brandProfile.secondaryColor2} | Accent: ${brandProfile.accentColor1} / ${brandProfile.accentColor2} | Text: #FFFFFF on dark, #1A1A1A on light
ONLY use these brand colors. ZERO external colors from references or elsewhere.

## PRODUCT DATA
${productDescriptionBlock}

${designSection}

## TEXT
Headline: "${conceptDirective.headline}"
${conceptDirective.bodyText ? `Body: "${conceptDirective.bodyText}"` : "Body: NONE — do not add body text"}
Brand name "${brandDisplayName}" must appear. Text NEVER overlaps product. All text from product data only — no invented claims.
CAPITALIZATION RULE (STRICT): ALL visible text must use CONSISTENT capitalization — either Title Case (Capitalize First Letter Of Each Word) or ALL CAPS. NEVER mix random uppercase and lowercase. No rAnDoM cApItAlIzAtIoN. Pick one style per text block and apply it uniformly.

## VISUAL DIRECTION
- ${productContext.tone} — photorealistic, commercial-grade, professional photography look
- ${conceptDirective.visualDirection}
- Emotion: ${conceptDirective.emotionalHook}
- Single consistent light source, real shadows, real textures
- Background: clean gradient/solid/subtle texture — never cluttered
- Audience: ${targetAudience.title}${targetAudience.pain ? ` | Pain: ${targetAudience.pain}` : ""}${targetAudience.angle ? ` | Angle: ${targetAudience.angle}` : ""}
- Differentiator: ${conceptDirective.differentiator}

## OUTPUT
1 image, ${outputConfig.aspectRatio}, ${outputConfig.resolution}. Product = hero (largest, most prominent). Only brand colors. Photorealistic. All text readable, no overlap with product. Meta-optimized.
✅ Creative with: layout, backgrounds, props, gradients, typography placement
❌ FORBIDDEN: changing product appearance, inventing labels, adding competitor products, using non-brand colors, copying text from reference images, generating/inventing logos, inconsistent text capitalization (random mix of uppercase/lowercase)
  `.trim();
}

// ─── Image Priority Section ──────────────────────────────────────────────────

interface ImageLayoutInfo {
  productImageCount: number;
  hasBrandLogo: boolean;
  conceptRefCount?: number;
  isCompetitorRefMode?: boolean;
}

function buildImagePrioritySection(imageCountOrInfo: number | ImageLayoutInfo): string {
  // Support legacy call with just a number
  const info: ImageLayoutInfo = typeof imageCountOrInfo === "number"
    ? { productImageCount: imageCountOrInfo, hasBrandLogo: false }
    : imageCountOrInfo;

  const { productImageCount, hasBrandLogo, conceptRefCount = 0, isCompetitorRefMode = false } = info;

  if (productImageCount <= 1 && !hasBrandLogo && conceptRefCount === 0 && !isCompetitorRefMode) {
    return `### Product Image (CRITICAL)
A single product image is attached. This is the ONLY reference for the product's appearance.
Render this product as the hero element in the ad — large, prominent, and central.
Reproduce its exact shape, labels, colors, and proportions.`;
  }

  let nextImageIndex = 1;
  const roleDescriptions: string[] = [];

  // Product images
  if (productImageCount >= 1) {
    roleDescriptions.push(
      `**IMAGE ${nextImageIndex} = OUR PRODUCT (FRONT)** — This is OUR product. COPY this exact packaging into the ad as the hero element. Same shape, same labels, same colors, same proportions.`,
    );
    nextImageIndex++;
  }
  if (productImageCount >= 2) {
    roleDescriptions.push(
      `**IMAGE ${nextImageIndex} = OUR PRODUCT (BACK)** — Back of OUR product packaging. Reference only for claims/ingredients — do NOT render back label in the ad.`,
    );
    nextImageIndex++;
  }
  if (productImageCount >= 3) {
    const extraCount = productImageCount - 2;
    roleDescriptions.push(
      `**IMAGE ${nextImageIndex}${extraCount > 1 ? `-${nextImageIndex + extraCount - 1}` : ""} = OUR PRODUCT (EXTRA ANGLES)** — Additional angles of OUR product. Supplementary reference.`,
    );
    nextImageIndex += extraCount;
  }

  // Brand logo
  if (hasBrandLogo) {
    roleDescriptions.push(
      `**IMAGE ${nextImageIndex} = BRAND LOGO** — If the ad needs a logo, use THIS image EXACTLY as-is: zero modifications, zero redesign, zero creative alterations. Reproduce pixel-for-pixel. Do NOT generate or invent any logo — use ONLY this attached logo.`,
    );
    nextImageIndex++;
  }

  // Concept reference images
  if (conceptRefCount > 0) {
    roleDescriptions.push(
      `**IMAGE ${nextImageIndex}${conceptRefCount > 1 ? `-${nextImageIndex + conceptRefCount - 1}` : ""} = STYLE REFERENCE (LAYOUT ONLY)** — Copy the LAYOUT and STYLE from these images. But the product shown in them is a DIFFERENT brand — replace it with OUR product (Image 1).`,
    );
    nextImageIndex += conceptRefCount;
  }

  // Competitor reference image
  if (isCompetitorRefMode) {
    roleDescriptions.push(
      `**IMAGE ${nextImageIndex} = COMPETITOR AD (LAST — LAYOUT ONLY)** — Copy this ad's LAYOUT, COMPOSITION, and STYLE. But replace the competitor's product with OUR product (Image 1), replace their text with OUR product data, replace their colors with OUR brand colors.`,
    );
    nextImageIndex++;
  }

  const totalImages = nextImageIndex - 1;

  return `### Attached Image Map (${totalImages} images)
${roleDescriptions.join("\n")}

CORE RULE: Image 1 is OUR product — it must appear in the final ad exactly as shown. The LAST image is a layout reference — copy its design but swap in OUR product, OUR text, OUR colors.`;
}

// ─── Product Description Block ────────────────────────────────────────────────

function buildProductDescriptionBlock(
  displayName: string,
  productContext: ProductContext,
  productDescription?: string | null,
): string {
  const lines: string[] = [
    `Product: "${displayName}" | Brand: "${productContext.brandName}"`,
    `Summary: ${productContext.rawSummary}`,
  ];

  if (productContext.tagline) {
    lines.push(`Tagline: "${productContext.tagline}"`);
  }

  if (productContext.flavorVariant) {
    lines.push(`Flavor/Variant: ${productContext.flavorVariant}`);
  }

  if (productDescription) {
    lines.push(`Description: ${productDescription}`);
  }

  if (productContext.claims.length > 0) {
    lines.push(`Claims (verified — use ONLY these): ${productContext.claims.join("; ")}`);
  }

  if (productContext.keyIngredients.length > 0) {
    lines.push(`Key ingredients: ${productContext.keyIngredients.join(", ")}`);
  }

  if (productContext.benefits.length > 0) {
    lines.push(`Benefits: ${productContext.benefits.join("; ")}`);
  }

  if (productContext.servingInfo) {
    lines.push(`Serving info: ${productContext.servingInfo}`);
  }

  if (productContext.priceInfo) {
    lines.push(`Price/Value: ${productContext.priceInfo}`);
  }

  if (productContext.certifications.length > 0) {
    lines.push(`Certifications: ${productContext.certifications.join(", ")}`);
  }

  if (productContext.socialProof) {
    lines.push(`Social proof: ${productContext.socialProof}`);
  }

  if (productContext.uniqueSellingPoints.length > 0) {
    lines.push(`Unique selling points: ${productContext.uniqueSellingPoints.join("; ")}`);
  }

  return lines.join("\n");
}

// ─── Language Instruction Block ───────────────────────────────────────────────

const LANGUAGE_LABELS: Record<string, string> = {
  de: "German (Deutsch)",
  fr: "French (Français)",
  es: "Spanish (Español)",
  vi: "Vietnamese (Tiếng Việt)",
};

/**
 * Build a language instruction block for non-English languages.
 * English variants (en-US, en-UK) return empty string — no extra instruction needed.
 */
function buildLanguageInstruction(language?: string): string {
  if (!language || language.startsWith("en")) return "";

  const label = LANGUAGE_LABELS[language] ?? language;
  return `
⚠️ LANGUAGE OVERRIDE (HIGHEST PRIORITY — READ FIRST)
ALL visible text on the ad image MUST be written in ${label}.
This is NON-NEGOTIABLE. Every headline, body copy, call-to-action, caption, and any other text rendered on the ad canvas MUST be in ${label}.
Write all ad copy natively in ${label} — do NOT translate from English, write directly in ${label} with natural, native-sounding phrasing.
Brand name and product name on the packaging remain unchanged (keep original spelling).
If the headline or body text provided below is in English, you MUST rewrite it in ${label} while preserving the meaning and emotional impact.
`;
}

// ─── Ad Copy Override Block ───────────────────────────────────────────────────

function buildAdCopyBlock(adCopyOverride?: AdCopyOverride): string {
  if (!adCopyOverride) return "";

  const { headline, bodyText, additionalNotes } = adCopyOverride;
  if (!headline && !bodyText && !additionalNotes) return "";

  const lines: string[] = [
    "⚠️ MANDATORY AD COPY (HIGHEST PRIORITY — overrides all generated text)",
    "The user has provided EXACT ad copy below. You MUST use these VERBATIM — no paraphrasing, no rewording, no translation, no truncation. Reproduce character-for-character on the ad image.",
  ];

  if (headline) {
    lines.push(`Headline (EXACT): "${headline}"`);
  }
  if (bodyText) {
    lines.push(`Body Text (EXACT): "${bodyText}"`);
  }
  if (additionalNotes) {
    lines.push(`Additional Direction: ${additionalNotes}`);
  }

  lines.push("Do NOT use auto-generated headlines or body text from concept analysis — use ONLY the text above.");
  lines.push("");

  return lines.join("\n");
}

// ─── Design Section Builder ─────────────────────────────────────────────────

/**
 * Parse layout variants from the concept prompt text.
 * Variants are defined as "### Variant X" blocks within the prompt.
 */
function parseConceptVariants(promptText: string): string[] {
  if (!promptText.trim()) return [];

  const parts = promptText.split(/(?=### Variant [A-Z])/);
  const variants: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith("### Variant")) {
      const cleanedVariant = trimmed
        .replace(/### Variant Selection Guide[\s\S]*$/, "")
        .replace(/### Creative Testing Protocol[\s\S]*$/, "")
        .replace(/\|[\s\S]*$/, "")
        .trim();
      if (cleanedVariant) {
        variants.push(cleanedVariant);
      }
    }
  }

  return variants;
}

/**
 * Build the unified design section from the single concept prompt.
 *
 * Logic:
 * - If concept has a prompt: inject it as visual direction + pick variant if present
 * - If concept has reference images but no variants: use reference images to guide layout variation
 * - If no prompt at all: fall back to generic layout
 */
function buildDesignSection(
  conceptPrompt: ConceptPrompt | null,
  outputConfig: OutputConfig,
  visualIdentifiers?: string,
): string {
  // No concept prompt at all — use default composition + generic variant
  if (!conceptPrompt?.prompt) {
    const fallbackComposition = `## COMPOSITION & LAYOUT
- Upper-left: Bold headline text, dominant (~40% vertical space)
- Right-center: Product packaging, slightly below center, grounded
- Lower-left foreground: Product form scattered naturally (if applicable)
- Background: Clean, minimal — ample negative space`;

    const genericVariant = buildGenericVariantSection(outputConfig.variantIndex, outputConfig.count);
    return `${fallbackComposition}\n\n${genericVariant}`;
  }

  const conceptLabel = conceptPrompt.label || conceptPrompt.conceptId;
  const conceptVariants = parseConceptVariants(conceptPrompt.prompt);

  // Build the concept direction section — the full prompt content
  const conceptSection = `## CONCEPT: "${conceptLabel}" — VISUAL DIRECTION (FOLLOW STRICTLY)
The following rules define the design language for this concept. Every element, layout choice, and visual hierarchy MUST align with these rules:

${conceptPrompt.prompt}`;

  // Build layout section — pick ONE specific variant for this ad
  let layoutSection: string;

  if (conceptVariants.length > 0) {
    const selectedVariantIndex = outputConfig.variantIndex % conceptVariants.length;
    const selectedVariant = conceptVariants[selectedVariantIndex];

    layoutSection = `## LAYOUT (MANDATORY — follow this exact layout structure)
You MUST use the following layout for this ad. Do NOT deviate from the specified element positions and spatial hierarchy.

${selectedVariant}

Follow this layout precisely. Place each element (headline, product, proof element, brand mark) in the exact positions described above.`;
  } else if (conceptPrompt.referenceImages.length > 0) {
    // No explicit variants but has reference images — use them to guide layout variation
    layoutSection = buildReferenceImageVariantSection(outputConfig.variantIndex, outputConfig.count);
  } else {
    layoutSection = buildGenericVariantSection(outputConfig.variantIndex, outputConfig.count);
  }

  // Add reference image instruction if concept has reference images
  const refImageNote = conceptPrompt.referenceImages.length > 0
    ? `\n\n## REFERENCE IMAGES — COPY LAYOUT, SWAP PRODUCT + COLORS + TEXT
${conceptPrompt.referenceImages.length} reference image(s) are attached (last image(s)). Copy their LAYOUT and COMPOSITION closely — same spatial grid, same element placement, same visual hierarchy.
But swap these 3 things:
1. **Product** → Use OUR product from Image 1 (NOT the reference's product)
2. **Colors** → Use OUR brand colors (NOT the reference's colors)
3. **Text** → Use OUR product data (NOT the reference's text)
The result should look like the SAME ad template but for a different brand.`
    : "";

  return `${conceptSection}${refImageNote}\n\n${layoutSection}`;
}

/**
 * When concept has reference images but no explicit variant blocks,
 * generate variant diversity by varying how reference images are interpreted.
 */
function buildReferenceImageVariantSection(variantIndex: number, totalCount: number): string {
  const REFERENCE_VARIANT_LENSES = [
    "Follow the primary reference image's composition closely — match its spatial hierarchy, element placement, and visual weight distribution",
    "Take the color palette approach from the reference image(s) but use an inverted spatial layout — swap the positions of text and product elements",
    "Extract the typography style and text-to-image ratio from the reference, but use a diagonal or asymmetric composition instead",
    "Use the reference image's background treatment and atmosphere, but reorganize all foreground elements into a centered, symmetrical layout",
    "Combine elements from both reference images (if 2): take the layout from one and the visual style from the other",
    "Create a minimalist interpretation: keep only the strongest single design element from the reference image(s) and build a cleaner version around it",
  ] as const;

  if (totalCount <= 1 || variantIndex === 0) {
    return `## LAYOUT
Analyze the attached reference image(s) carefully. Follow the primary reference's composition — match its spatial hierarchy, element placement, and visual weight distribution. Adapt it to fit this ad's content while maintaining the reference's design language.`;
  }

  const lens = REFERENCE_VARIANT_LENSES[(variantIndex - 1) % REFERENCE_VARIANT_LENSES.length];
  return `## LAYOUT — VARIANT #${variantIndex + 1}
Creative direction: ${lens}
Create a distinctly different visual approach from other variants while keeping brand identity consistent.`;
}

// ─── Generic Variant Fallback ────────────────────────────────────────────────

const GENERIC_VARIANT_LENSES = [
  "Classic Stack: vertical top-down flow — headline at top, product center, supporting elements below",
  "Split Frame: canvas divided into 2 columns — text/data on left, product hero on right",
  "Product Dominant: product fills 40-50% of canvas center, headline as overlay badge or banner",
  "Minimalist: clean lines, maximum negative space, focused on headline + product only",
  "Dynamic: asymmetric composition, angled elements, visual movement and energy",
  "Editorial: magazine-style layout with headline as editorial header, product offset below",
] as const;

function buildGenericVariantSection(variantIndex: number, totalCount: number): string {
  if (totalCount <= 1 || variantIndex === 0) {
    return `## LAYOUT
Use a classic stack layout: headline at top (35-40% of canvas), product hero centered below, supporting elements at bottom. Clean and authoritative — strong default composition.`;
  }

  const lens = GENERIC_VARIANT_LENSES[(variantIndex - 1) % GENERIC_VARIANT_LENSES.length];
  return `## LAYOUT — VARIANT #${variantIndex + 1}
Creative direction: ${lens}
Create a distinctly different visual approach from other variants while keeping brand identity and all text identical.`;
}

// ─── Competitor Reference Prompt ─────────────────────────────────────────────

/**
 * Per-variant optimization lenses for competitor reference mode.
 * Each variant applies a different improvement angle while keeping the same base layout.
 */
const COMPETITOR_VARIANT_OPTIMIZATIONS = [
  `Maximum fidelity to reference — recreate the SAME scene, SAME props, SAME lighting, SAME composition. The ONLY changes: our product, our brand colors, our text. Target 90%+ visual similarity.`,
  `Same scene and composition as reference — but slightly elevated production quality: crisper lighting, sharper product, cleaner typography. Same layout DNA, polished execution.`,
  `Same layout and scene structure — but shift camera angle 5-10° for a fresh perspective. Keep same props, same lighting direction, same mood. Nearly identical but not a pixel copy.`,
  `Same composition and spatial grid — but slightly warmer/cooler lighting tone. Same props arrangement, same product position, same text zones. Subtle mood variation only.`,
  `Same layout foundation — but replace props with ones more relevant to OUR product category while keeping them in the SAME positions and SAME quantity. Everything else identical.`,
] as const;

/**
 * Build prompt for competitor-reference mode.
 * The goal: replicate the competitor ad's layout/concept as closely as possible
 * but with the user's product, and make it BETTER — more persuasive, more authentic,
 * more scroll-stopping. Each variant applies a different optimization lens.
 */
function assembleTraditionalRefPrompt(
  analysis: CompetitorAdAnalysis,
  productContext: ProductContext,
  brandProfile: BrandProfile,
  targetAudience: AudienceProfile,
  outputConfig: OutputConfig,
  productName?: string,
  productDescription?: string | null,
  productImageCount?: number,
  language?: string,
  hasBrandLogo?: boolean,
  adCopyOverride?: AdCopyOverride,
): string {
  const displayName = productName || productContext.productName;
  const brandDisplayName = brandProfile.brandName || productContext.brandName;

  const productDescriptionBlock = buildProductDescriptionBlock(
    displayName,
    productContext,
    productDescription,
  );

  // Select variant-specific optimization
  const variantOptimization = COMPETITOR_VARIANT_OPTIMIZATIONS[
    outputConfig.variantIndex % COMPETITOR_VARIANT_OPTIMIZATIONS.length
  ];

  // Build improvement directives from weaknesses + improvement opportunities
  const improvementLines: string[] = [];
  if (analysis.weaknesses.length > 0) {
    improvementLines.push(...analysis.weaknesses.map((w) => `- FIX: ${w}`));
  }
  if (analysis.improvementOpportunities?.length) {
    improvementLines.push(...analysis.improvementOpportunities.map((o) => `- UPGRADE: ${o}`));
  }
  const improvementBlock = improvementLines.length > 0
    ? improvementLines.join("\n")
    : "- Make it sharper, more polished, and more premium overall";

  const languageBlock = buildLanguageInstruction(language);
  const adCopyBlock = buildAdCopyBlock(adCopyOverride);

  // Human element constraint — ABSOLUTE: no humans unless reference has them
  const humanBlock = analysis.hasHumanElements
    ? `## HUMAN ELEMENTS (MATCH REFERENCE)
The reference contains human elements: ${analysis.humanDescription ?? "visible"}.
You MAY include similar human elements (same type — e.g. if reference has a hand, you may include a hand). Match the reference's approach to human presence.
People rules: real skin with pores, correct finger count (5/hand), natural joints, genuine expressions.`
    : `## NO HUMAN ELEMENTS (ABSOLUTE — ZERO TOLERANCE)
The reference contains NO human body parts — no hands, no arms, no face, no body, no fingers.
You MUST NOT add ANY human elements. ZERO hands holding the product, ZERO body parts visible anywhere.
This is a product-only composition. If you add any human element = instant reject.`;

  return `${adCopyBlock}${languageBlock}
TASK: Generate 1 static ${outputConfig.funnelStage} ad at ${outputConfig.aspectRatio}, ${outputConfig.resolution}. REPLICATE the competitor reference ad as closely as possible — same layout, same scene, same mood — but with OUR product, OUR colors, OUR text.

## PHOTOREALISM MANDATE
This ad MUST look like a real professional photograph:
- 50-85mm prime lens, f/2.8-f/5.6, product tack-sharp, background with natural depth
- Single dominant key light, consistent shadows, specular highlights on glossy materials
- Real surface textures, contact shadows, natural imperfections
- Product MUST match attached photo EXACTLY — same shape, labels, colors, material textures
- FAIL IF: product shape differs from photo, plastic/waxy skin, wrong finger count, floating objects, AI-smoothed textures

## BRAND COLORS (ZERO TOLERANCE)
ONLY colors allowed — replace ALL competitor colors with these:
Primary: ${brandProfile.primaryColor1} / ${brandProfile.primaryColor2} | Secondary: ${brandProfile.secondaryColor1} / ${brandProfile.secondaryColor2} | Accent: ${brandProfile.accentColor1} / ${brandProfile.accentColor2} | Text: #FFFFFF or #1A1A1A
Map to SAME distribution ratios as reference. Zero competitor color leakage.

${humanBlock}

## MISSION — RECREATE THE REFERENCE AD FOR OUR BRAND
Competitor ad is attached as the LAST image (smallest image). Recreate that ad's layout as closely as possible using OUR product, OUR colors, OUR text.

### FOLLOW the reference layout:
- SAME spatial grid, element positions, proportions as described in the analysis
- SAME background type, treatment, and atmosphere
- SAME lighting direction, camera angle, depth-of-field
- SAME props TYPE and arrangement (similar items in same positions)
- SAME composition flow, visual hierarchy, negative space
- SAME mood and energy
- SAME typography hierarchy and text sizing ratios

### ONLY CHANGE:
- Product → OUR product (from attached images — these are the ONLY images attached)
- Colors → OUR brand palette (see BRAND COLORS above)
- Text content → from OUR product data
- Logo → NEVER generate or invent any logo. If a logo image is attached, reproduce it EXACTLY as-is with zero modifications. Otherwise only as printed on product packaging

### VARIANT DIRECTION
${variantOptimization}

## REFERENCE ANALYSIS (REPLICATE THIS)
**Concept:** ${analysis.creativeConcept ?? "N/A"}
**Layout Grid:** ${analysis.layout}
**Replication Guide:** ${analysis.replicationGuide}
**Product Presentation:** ${analysis.productPresentation ?? "N/A"} → Place OUR product in this SAME way
**Props & Context:** ${analysis.propsAndContext ?? "N/A"} → Use SIMILAR props in SAME positions
**Text:** ${analysis.textContent ?? "N/A"} → Replace with OUR product text, same format
**Colors (❌ BANNED — replace with ours):** ${analysis.colorScheme}
**Typography:** ${analysis.typographyStyle}
**Hierarchy:** ${analysis.visualHierarchy}
**Composition:** ${analysis.composition}
**Text Placement:** ${analysis.textPlacement}
**Mood:** ${analysis.mood}
**Strengths (KEEP):** ${analysis.strengths.join("; ")}
**Improvements to make:**
${improvementBlock}

## PRODUCT (HIGHEST PRIORITY — match attached images exactly)
OUR product visual identity: ${productContext.visualIdentifiers}
${productDescriptionBlock}

${buildImagePrioritySection({
    productImageCount: productImageCount ?? 1,
    hasBrandLogo: hasBrandLogo ?? false,
    isCompetitorRefMode: true,
  })}

NOTE: The first image appears TWICE — this is intentional. It is OUR product and must be reproduced exactly. The LAST image (smallest) is the competitor reference for LAYOUT ONLY — do NOT copy its product.

### Product Fidelity (STRICTLY ENFORCED)
Attached product image(s) = SINGLE SOURCE OF TRUTH:
1. **Exact form factor**: Pouch stays pouch, bottle stays bottle. NEVER substitute.
2. **Exact labels**: All packaging text/graphics reproduced pixel-by-pixel.
3. **Exact contents**: Gummies/capsules keep EXACT shape. No transformation.
4. **Match reference position**: Same position and relative size as competitor's product.
5. **Real material textures**: Same reflectivity, surface grain, light interaction as real product.
6. **No phantom products**: Only products from attached images.
7. **No reinterpretation**: Product appearance is SACRED — zero creative liberty.

## TEXT
Reference text: "${analysis.textContent ?? "N/A"}"
Write NEW text that: matches same format (word count ±2, same structure), uses ONLY OUR product data, brand name "${brandDisplayName}" must appear. Zero invented claims.

## TYPOGRAPHY
Font: ${brandProfile.typography} | Match reference's hierarchy. Crisp at 375px.
CAPITALIZATION RULE (STRICT): ALL visible text must use CONSISTENT capitalization — either Title Case (Capitalize First Letter Of Each Word) or ALL CAPS. NEVER mix random uppercase and lowercase. No rAnDoM cApItAlIzAtIoN. Pick one style per text block and apply it uniformly.

## AUDIENCE
${targetAudience.title}${targetAudience.pain ? ` | Pain: ${targetAudience.pain}` : ""}${targetAudience.angle ? ` | Angle: ${targetAudience.angle}` : ""}

## OUTPUT RULES
1. ${outputConfig.aspectRatio}, ${outputConfig.resolution} — photorealistic
2. CLOSELY REPLICATE reference layout — same spatial grid, same composition, same mood
3. Product = OUR product from attached images, in SAME position as competitor's product
4. Colors = OUR brand colors only, mapped to SAME distribution as reference
5. Text = NEW from OUR product data, placed in SAME zones as reference
6. Props = SIMILAR type in SAME positions (not identical but same category)
7. ${analysis.hasHumanElements ? `Human elements: match reference style (${analysis.humanDescription ?? "visible"}) — real skin, correct finger count, genuine expressions` : "ZERO human elements — no hands, no body parts, no people anywhere"}
8. LOGO: NEVER generate or invent any logo. If a brand logo image is attached, reproduce EXACTLY as-is — zero modifications. Otherwise only the logo naturally printed on product packaging
9. The result should look like the SAME AD but for a different brand
  `.trim();
}

// ─── Native/Stealth Reference Prompt ─────────────────────────────────────────

/**
 * Per-variant optimization lenses for native/stealth reference mode.
 * Each variant applies a different scene variation while keeping the same authentic vibe.
 */
const NATIVE_VARIANT_OPTIMIZATIONS = [
  `REPLICATION PRIORITY: Maximum scene fidelity — recreate this EXACT scene as closely as possible. Same room type, same lighting direction, same camera angle, same object arrangement, same clutter level, same surface materials. The ONLY change: our product replaces theirs. Target 90-95% scene similarity.`,
  `REPLICATION + AUTHENTICITY: Start from a near-identical scene replica, then boost AUTHENTICITY. Same setup — but add 1-2 more natural imperfections (slight dust, uneven surface, fabric wrinkle). Make the iPhone aesthetic even MORE convincing. Same scene, more real.`,
  `REPLICATION + FRESH ANGLE: Same scene, same objects, same lighting setup — but captured from a slightly DIFFERENT camera angle (5-15° shift). If reference is eye-level, try slightly above. Same scene DNA, fresh but similar perspective.`,
  `REPLICATION + RICHER CONTEXT: Same scene type, same layout — but add 1-2 personal objects that make the space feel MORE lived-in (a coffee mug, a used towel, an open book). Same vibe, richer story. Product stays in same position.`,
  `REPLICATION + MOOD VARIATION: Same scene setup and composition — but subtly shift the lighting warmth (slightly warmer or cooler). Same arrangement, slightly different atmosphere. Scene is still immediately recognizable as the same setup.`,
] as const;

// ─── Native Prompt Helper Functions ──────────────────────────────────────────

function buildProductVisibilityBlock(
  visibility: CompetitorAdAnalysis["productVisibility"],
  displayName: string,
  productContext: ProductContext,
): string {
  switch (visibility) {
    case "hero":
      return `## PRODUCT PLACEMENT — HERO (prominent but authentic)
"${displayName}" is the main visual subject but presented AUTHENTICALLY — as if someone placed it on a surface to photograph it casually. Not centered perfectly, not studio-lit. Real-world context around it.
Product is ${productContext.physicalDimensions}. It should occupy 25-35% of the frame at correct real-world scale.
The product must match the attached reference images EXACTLY — same packaging, labels, colors, proportions.`;

    case "prominent":
      return `## PRODUCT PLACEMENT — PROMINENT (clearly visible, important)
"${displayName}" is clearly visible and recognizable but shares attention with the scene. It sits naturally among other objects — not isolated, not spotlighted.
Product is ${productContext.physicalDimensions}. It should occupy 15-25% of the frame at correct scale.
Label should be readable but the product is part of a larger scene, not the sole focus.`;

    case "supporting":
      return `## PRODUCT PLACEMENT — SUPPORTING (visible but secondary)
"${displayName}" is visible in the scene but NOT the focal point. It's on a counter, desk, or shelf — clearly there but the eye goes to the scene composition first.
Product is ${productContext.physicalDimensions}. It should occupy 5-15% of the frame.
Label partially visible. Product is at a slight angle — not facing camera perfectly.`;

    case "incidental":
      return `## PRODUCT PLACEMENT — INCIDENTAL (barely noticeable)
"${displayName}" is in the scene but EASY TO MISS on first glance. Partially hidden behind other objects, at the edge of frame, or blending with surrounding clutter.
Product is ${productContext.physicalDimensions}. It should occupy <5% of the frame.
The viewer notices the SCENE first. The product is discovered only on second or third look. Placement must feel ACCIDENTAL — as if someone left it there, not placed it for a photo.`;

    case "absent":
      return `## PRODUCT PLACEMENT — ABSENT (no physical product)
No physical product appears in the scene. "${displayName}" may only be referenced through text (caption, conversation, screen text) or implied context.`;

    default:
      return buildProductVisibilityBlock("supporting", displayName, productContext);
  }
}

function buildTextDensityBlock(
  textDensity: CompetitorAdAnalysis["textDensity"],
  brandingLevel: CompetitorAdAnalysis["brandingLevel"],
): string {
  switch (textDensity) {
    case "heavy":
      return `## TEXT APPROACH — MODERATE OVERLAY
Include text overlays: a short caption or statement. Keep it authentic — use casual caption style, not marketing headline style.${brandingLevel === "none" ? " No brand name in text overlays." : ""}
Text should feel like something a real person would type on their story or post.`;

    case "moderate":
      return `## TEXT APPROACH — LIGHT CAPTION
Include a brief text element: a short caption, location tag, or timestamp-style overlay.${brandingLevel === "none" ? " No brand name visible." : ""}
Text should be minimal and feel organic — not a designed headline.`;

    case "minimal":
      return `## TEXT APPROACH — MINIMAL
Very little text — at most a short caption, emoji, or location tag. The image speaks for itself.${brandingLevel === "none" ? " Zero brand mentions in text." : ""}
Any text should feel like an afterthought, not the purpose of the image.`;

    case "none":
      return `## TEXT APPROACH — NO TEXT
No visible text overlays in the image. Pure visual content. Let the image tell the entire story.
If the reference has no text, respect that — do NOT add captions, headlines, or any text.`;

    default:
      return buildTextDensityBlock("minimal", brandingLevel);
  }
}

function buildStealthCategoryBlock(
  stealthCategory: CompetitorAdAnalysis["stealthCategory"],
  analysis: CompetitorAdAnalysis,
): string {
  switch (stealthCategory) {
    case "ENV":
      return `## SCENE TYPE — ENVIRONMENT
This is an environment/setting scene. The focus is on a real, lived-in space where the product happens to exist.
Key elements: natural everyday clutter, real surfaces and textures, organic object arrangement.
Setting: ${analysis.propsAndContext ?? "everyday environment"}
The space must feel REAL — not styled, not minimalist, not curated. Think: actual kitchen counter, real desk with stuff on it, bedside table with daily items.
Objects should have WEIGHT — they indent soft surfaces, cast contact shadows, and relate to each other naturally.`;

    case "FMT":
      return `## SCENE TYPE — CONTENT FORMAT
This is a screenshot or content format scene. The product is referenced in TEXT, not shown physically.
Replicate the exact platform UI shown in the reference (iMessage, Instagram story, Notes app, etc.).
Text content must feel like REAL conversation or content — not scripted, not promotional.
The product name appears casually, as part of normal text — not highlighted, not the main topic.`;

    case "STR":
      return `## SCENE TYPE — STORY
This is a story/narrative scene. A moment is unfolding and the product appears incidentally.
The STORY is the hero — something is happening that makes the viewer stop and look.
Setting: ${analysis.propsAndContext ?? "story scene"}
Product enters the scene as a background detail — it's there because someone uses it, not because it's being advertised.`;

    case "HUM":
      return `## SCENE TYPE — HUMAN-CENTRIC
A real person is the main subject. The product is incidental — visible somewhere in their environment.
The PERSON and their moment is what stops the scroll. The product is subconscious.
BODY TYPE: "attainable aspiration" — visibly fit and toned from consistent training (1-2 years). NOT a fitness model. NOT average. Think "that person at your gym everyone admires."
Real skin texture, natural imperfections, genuine expression — caught in a real moment, not posing.
Clothing: worn-in athletic wear, not brand-new matching sets. Real wrinkles, faded logos, actual fit.`;

    default:
      return buildStealthCategoryBlock("ENV", analysis);
  }
}

function buildBrandingLevelBlock(
  brandingLevel: CompetitorAdAnalysis["brandingLevel"],
  adType: CompetitorAdAnalysis["adType"],
  brandProfile: BrandProfile,
  brandDisplayName: string,
): string {
  switch (brandingLevel) {
    case "none":
      return `## BRANDING — ZERO (completely organic)
NO brand elements visible ANYWHERE in the scene:
- No brand colors applied to backgrounds, overlays, or decorative elements
- No logo overlays or watermarks
- No brand typography — use system fonts or casual handwriting
- No brand name in text overlays
The ONLY place "${brandDisplayName}" branding may appear is naturally ON the product packaging itself (as it exists in the attached product photos). Even the product label should not be the focal point.
This must look like content from someone who happens to OWN the product, not someone PROMOTING it.`;

    case "subtle":
      return `## BRANDING — ON-PACKAGING ONLY (authentic ownership)
Brand elements appear ONLY as they naturally exist on the product packaging:
- Product label shows brand name/logo as printed — no enhancement, no spotlight
- No separate brand color treatment on backgrounds or overlays
- No standalone logo placement
- Typography for any text overlays: casual/system fonts, NOT brand typography
Brand color palette (${brandProfile.primaryColor1}, ${brandProfile.primaryColor2}) should NOT influence the scene's color grading or any overlays. The scene has its own natural colors.
The product label is readable if someone looks, but not designed to catch the eye first.`;

    case "strong":
    default:
      if (adType === "ugc") {
        return `## BRANDING — AUTHENTIC UGC (visible but not designed)
The product and its branding are visible because someone is SHOWING it, not because a designer placed it:
- Product label clearly readable — person is holding/displaying product
- Brand name "${brandDisplayName}" visible on packaging
- No additional brand elements outside the product (no brand-colored backgrounds, no logo overlays)
- Text overlays (if any) use casual fonts, not brand typography
- Scene colors are natural/ambient — NOT brand colors
This feels like a real person sharing a product they use, not a brand creating content.`;
      }
      return buildBrandingLevelBlock("subtle", adType, brandProfile, brandDisplayName);
  }
}

function buildNativeImageMapSection(
  productImageCount: number,
  hasBrandLogo: boolean,
): string {
  let nextImageIndex = 1;
  const roleDescriptions: string[] = [];

  if (productImageCount >= 1) {
    roleDescriptions.push(
      `**IMAGE ${nextImageIndex} = OUR PRODUCT** — This is OUR product. Place it naturally in the scene. Reproduce its exact packaging, labels, and proportions.`,
    );
    nextImageIndex++;
  }

  if (productImageCount >= 2) {
    roleDescriptions.push(
      `**IMAGE ${nextImageIndex} = OUR PRODUCT (BACK)** — Back/detail of OUR product. Reference only — do NOT render back label in scene.`,
    );
    nextImageIndex++;
  }

  if (productImageCount >= 3) {
    const extraCount = productImageCount - 2;
    roleDescriptions.push(
      `**IMAGE ${nextImageIndex}${extraCount > 1 ? `-${nextImageIndex + extraCount - 1}` : ""} = OUR PRODUCT (EXTRA)** — Supplementary product reference.`,
    );
    nextImageIndex += extraCount;
  }

  if (hasBrandLogo) {
    roleDescriptions.push(
      `**IMAGE ${nextImageIndex} = BRAND LOGO** — If the ad needs a logo, use THIS image EXACTLY as-is: zero modifications, zero redesign. NEVER generate or invent any logo.`,
    );
    nextImageIndex++;
  }

  roleDescriptions.push(
    `**IMAGE ${nextImageIndex} = SCENE REFERENCE (LAST)** — Copy this scene's mood, lighting, camera angle, and composition. But replace the product in it with OUR product (Image 1).`,
  );

  const totalImages = nextImageIndex;

  return `### Attached Image Map (${totalImages} images)
${roleDescriptions.join("\n")}

CORE RULE: Image 1 = OUR product (what to show). Last image = scene reference (how to show it). Swap the reference's product with ours.`;
}

// ─── Native Reference Prompt Builder ─────────────────────────────────────────

/**
 * Build prompt for native/stealth and UGC reference mode.
 * The goal: replicate the reference image's scene/vibe/aesthetic
 * but with the user's product naturally placed in the scene.
 * Optimized for authenticity over polish — iPhone aesthetic, not studio.
 */
function assembleNativeRefPrompt(
  analysis: CompetitorAdAnalysis,
  productContext: ProductContext,
  brandProfile: BrandProfile,
  targetAudience: AudienceProfile,
  outputConfig: OutputConfig,
  productName?: string,
  productDescription?: string | null,
  productImageCount?: number,
  language?: string,
  hasBrandLogo?: boolean,
  adCopyOverride?: AdCopyOverride,
): string {
  const displayName = productName || productContext.productName;
  const brandDisplayName = brandProfile.brandName || productContext.brandName;

  const variantOptimization = NATIVE_VARIANT_OPTIMIZATIONS[
    outputConfig.variantIndex % NATIVE_VARIANT_OPTIMIZATIONS.length
  ];

  const languageBlock = buildLanguageInstruction(language);
  const adCopyBlock = buildAdCopyBlock(adCopyOverride);

  const productVisibilityBlock = buildProductVisibilityBlock(
    analysis.productVisibility,
    displayName,
    productContext,
  );

  const textDensityBlock = buildTextDensityBlock(
    analysis.textDensity,
    analysis.brandingLevel,
  );

  const categoryBlock = buildStealthCategoryBlock(
    analysis.stealthCategory ?? "ENV",
    analysis,
  );

  const brandingBlock = buildBrandingLevelBlock(
    analysis.brandingLevel,
    analysis.adType,
    brandProfile,
    brandDisplayName,
  );

  const imageMapBlock = buildNativeImageMapSection(
    productImageCount ?? 1,
    hasBrandLogo ?? false,
  );

  // Build improvement directives from weaknesses + improvement opportunities
  const improvementLines: string[] = [];
  if (analysis.weaknesses.length > 0) {
    improvementLines.push(...analysis.weaknesses.map((w) => `- FIX: ${w}`));
  }
  if (analysis.improvementOpportunities?.length) {
    improvementLines.push(...analysis.improvementOpportunities.map((o) => `- UPGRADE: ${o}`));
  }
  const improvementBlock = improvementLines.length > 0
    ? improvementLines.join("\n")
    : "- Make the scene feel more authentic and lived-in";

  return `${adCopyBlock}${languageBlock}
TASK: Create 1 authentic ${analysis.adType === "ugc" ? "user-generated" : "organic"} content image at ${outputConfig.aspectRatio}, ${outputConfig.resolution}. This must look like REAL content — a casual photo someone took with their phone, NOT an advertisement.

## AUTHENTICITY MANDATE (NON-NEGOTIABLE — READ FIRST)
This is NOT an ad. This is organic content that happens to feature "${displayName}" by "${brandDisplayName}".
- **Camera feel**: iPhone/smartphone, casual, unedited. NOT a professional camera. NOT studio lighting.
- **Composition**: Deliberately imperfect. Real photos have slight tilt, imperfect framing, natural clutter.
- **Product**: Must match attached product images EXACTLY (packaging, labels, proportions) — but placed NATURALLY in the scene, not spotlighted.
- **Overall test**: If someone scrolling Instagram/TikTok would think "this is a real post" before "this is an ad" — you succeeded. If they think "ad" first — instant reject.

## IPHONE CAMERA AESTHETIC (replaces studio photography)
This was shot on an iPhone 14/15 Pro. NOT a Canon/Sony. NOT a DSLR.
**Lens:** iPhone wide (26mm equivalent), f/1.78-f/2.2. Computational photography look — slightly HDR-processed but still natural.
**Focus:** Smartphone depth-of-field: mostly in focus with subtle background softening (Portrait mode OFF for candid feel, or ON with natural falloff for closer shots).
**Lighting:** Available ambient light ONLY — window light, overhead room lighting, outdoor natural light, gym fluorescents. NO softboxes, NO studio setups, NO ring lights.
**Color science:** iPhone color profile — slightly warm, slightly saturated, auto white balance (sometimes imperfect). NOT color-graded. NOT LUT-applied.
**Noise/grain:** Slight noise in shadows (especially indoor scenes). This is an iPhone, not a full-frame sensor.
**Angle:** Held at chest to head height, slightly tilted (2-8°). Real people don't hold phones perfectly level.
**Imperfections (CRITICAL):** Slight motion blur on edges, one finger shadow at frame edge, not-quite-perfect exposure, slightly off white balance in mixed lighting. These make it REAL.

${brandingBlock}

## MISSION — REPLICATE THIS SCENE AS CLOSELY AS POSSIBLE
The reference image (last attached) is your TARGET SCENE. Recreate it as closely as possible — same room, same setup, same objects, same lighting, same mood. The ONLY mandatory change: our product replaces the reference's product.

### REPLICATE EVERYTHING (match the reference closely):
- EXACT same setting type, room/environment character, surface materials
- SAME lighting direction, quality, color temperature, and mood
- SAME camera angle, distance, and framing
- SAME clutter level and object arrangement style
- SAME "feeling" — casual, intimate, energetic, cozy, etc.
- SIMILAR props and objects in the SAME positions (same type, same arrangement)
- SAME visual "weight" and composition balance

### ONLY THESE THINGS CHANGE:
- Product → OUR product from attached images (same position as reference's product)
- Small personal details → can vary slightly to avoid exact duplication
- Text content (if any) → write new authentic-feeling text, but same style and placement

### SIMILARITY TARGET
Someone seeing both images should think "this is the same scene, maybe taken a day apart" — same location, same setup, just slightly different personal items and our product instead of theirs.

### Improvements over reference:
${improvementBlock}

${categoryBlock}

${productVisibilityBlock}

${imageMapBlock}

### Product Fidelity
The product in the scene MUST match Image 1 (OUR product), NOT the scene reference's product:
- OUR product: ${productContext.visualIdentifiers}
- Exact packaging shape: ${productContext.packagingForm}
- Real-world scale: ${productContext.physicalDimensions}
- Natural angle — slightly turned, not perfectly facing camera
- Real surface interaction: contact shadow, slight reflection on glossy surfaces

## REFERENCE SCENE ANALYSIS (for scene understanding)
**Scene concept:** ${analysis.creativeConcept ?? "N/A"}
**Scene layout:** ${analysis.layout}
**Scene setup guide:** ${analysis.replicationGuide}
**Product in reference:** ${analysis.productPresentation ?? "N/A"} → Replicate this PLACEMENT STYLE with OUR product
**Props and context:** ${analysis.propsAndContext ?? "N/A"} → Use SIMILAR (not identical) contextual objects
**Text in reference:** ${analysis.textContent ?? "N/A"} → If present, create NEW authentic text with similar tone
**Lighting/mood:** ${analysis.mood}
**What makes it feel real:** ${analysis.authenticityScore ?? "N/A"}

${textDensityBlock}

## AUDIENCE
${targetAudience.title}${targetAudience.pain ? ` | Pain: ${targetAudience.pain}` : ""}${targetAudience.angle ? ` | Angle: ${targetAudience.angle}` : ""}

## ANTI-AD CONSTRAINTS (NON-NEGOTIABLE)
This must NOT look like an advertisement:
- ❌ No call-to-action buttons or "Shop Now" / "Buy" text
- ❌ No sale badges, discount text, or price tags
- ❌ No "limited time" or promotional language
- ❌ No perfect/symmetrical composition
- ❌ No studio lighting or professional photography feel
- ❌ No brand color schemes applied to backgrounds or overlays
- ❌ No marketing headlines or ad copy overlays (unless reference has casual caption)
- ❌ No artificially clean or curated aesthetics
- ✅ Product is a NATURAL part of the scene, not the hero
- ✅ Scene is interesting on its own WITHOUT the product
- ✅ Viewer's first thought: "cool photo/post" NOT "this is selling something"

## VARIANT DIRECTION
${variantOptimization}

## OUTPUT RULES
1. 1 image, ${outputConfig.aspectRatio}, ${outputConfig.resolution}
2. Product matches attached reference images exactly — packaging, labels, proportions
3. Scene CLOSELY REPLICATES the reference image — same setting, same arrangement, same mood, same camera angle
4. iPhone camera aesthetic — NOT professional photography
5. Natural imperfections: slight tilt, ambient lighting, real textures, organic clutter
6. Product placed in SAME position/style as reference's product — natural, not spotlighted
7. No ad elements: no CTA, no sale badges, no brand overlays, no marketing text
8. Authenticity test: must pass as real social media content, not generated marketing
9. All text (if any) feels organic — casual caption style, not headline style. CAPITALIZATION: consistent Title Case or ALL CAPS only — never random mixed case
10. Overall result: nearly identical scene to reference, but with our product naturally placed
  `.trim();
}

// ─── Competitor Reference Prompt — Dispatcher ────────────────────────────────

/**
 * Build prompt for competitor-reference mode.
 * Routes to the appropriate builder based on the detected ad type:
 * - "traditional" → branded ad prompt (layout template + brand optimization)
 * - "stealth_native" | "ugc" → native/authentic prompt (scene replication + iPhone aesthetic)
 * Function signature is unchanged for backwards compatibility.
 */
export function assembleCompetitorRefPrompt(
  analysis: CompetitorAdAnalysis,
  productContext: ProductContext,
  brandProfile: BrandProfile,
  targetAudience: AudienceProfile,
  outputConfig: OutputConfig,
  productName?: string,
  productDescription?: string | null,
  productImageCount?: number,
  language?: string,
  hasBrandLogo?: boolean,
  adCopyOverride?: AdCopyOverride,
): string {
  // Route to the appropriate prompt builder based on detected ad type
  if (analysis.adType === "stealth_native" || analysis.adType === "ugc") {
    return assembleNativeRefPrompt(
      analysis, productContext, brandProfile, targetAudience, outputConfig,
      productName, productDescription, productImageCount, language, hasBrandLogo, adCopyOverride,
    );
  }

  // Default: traditional branded ad
  return assembleTraditionalRefPrompt(
    analysis, productContext, brandProfile, targetAudience, outputConfig,
    productName, productDescription, productImageCount, language, hasBrandLogo, adCopyOverride,
  );
}
