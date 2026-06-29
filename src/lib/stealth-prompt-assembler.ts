// Server-only: Assembles KIE-optimized prompts for stealth ad generation
// Four category-specific templates: ENV, FMT, STR, HUM
// Key difference from regular assembler: NO brand colors, NO logo, NO CTA

import type { StealthScenePlan } from "@/features/stealth/types";

// ─── Audience context for demographic-aware prompt tuning ─────────────────────

interface AudienceContext {
  ageRange?: string;
  sensitivity?: "normal" | "high";
}

// ─── Product Scale Accuracy (prepended to ENV/STR/HUM prompts) ──────────────

const PRODUCT_SCALE_BLOCK = `
PRODUCT IMAGE FIDELITY — ABSOLUTE REQUIREMENT (HIGHEST PRIORITY):
- The attached reference product images are the SOLE source of truth for how the product looks. REPRODUCE the product EXACTLY as shown — same packaging shape, same label design, same colors, same proportions, same materials.
- ZERO creative liberty on the product: do NOT redesign, recolor, reshape, add, or remove ANY element of the packaging. If the label is green, it stays green. If the jar is round, it stays round. If there is a specific logo placement, keep it identical.
- MATCH THE EXACT FORM FACTOR from reference images:
  - If reference shows a JAR → render that exact jar shape and size. Do NOT turn it into a pouch, bottle, or any other container.
  - If reference shows a POUCH/BAG → render that exact pouch/bag. Do NOT turn it into a jar or bottle.
  - If reference shows GUMMIES → they are in a small jar/pouch that fits in one hand, similar to a pill bottle or small snack container.
  - If reference shows RESIN → it is in a VERY SMALL jar, about the size of a lip balm or small cream jar.
- SIZE & SCALE — use real-world proportions:
  - The product is SMALLER than a phone, MUCH smaller than a water bottle.
  - Use nearby everyday objects as scale anchors: hand, phone, coffee cup, keys.
  - The product should NOT dominate the frame — it is a SMALL item among many.
- If unsure about ANY detail of the product appearance, COPY DIRECTLY from the reference images rather than guessing or improvising.`;

// ─── Anti-Ad Constraints (appended to every prompt) ─────────────────────────

const ANTI_AD_BLOCK = `
Style: casual, unedited, authentic. No studio lighting. No professional composition.
CRITICAL CONSTRAINTS — This must NOT look like an advertisement:
- No logo overlays or watermarks — NEVER generate, invent, or create any brand logo. If a logo exists on the product packaging, it stays as-is on the packaging only
- CAPITALIZATION RULE: All visible text must use consistent capitalization — either Title Case or ALL CAPS. Never random mixed case
- No call-to-action buttons or text
- No sale badges, discount text, or price tags
- No "limited time" or promotional overlays
- No brand color schemes or guidelines
- No perfect/symmetrical composition
- Product is a SUPPORTING element, not the hero — it should be EASY TO MISS on first glance
- The overall impression must be "real life content" not "marketing material"
- Product placement must feel ACCIDENTAL, not arranged — as if someone left it there, not placed it for a photo
- Product should be partially obscured, at an angle, behind other objects, or at the edge of frame
- The viewer should notice the SCENE first. The product is discovered only on second or third look.`;

const SENSITIVE_EXTRA_BLOCK = `
EXTRA CONSTRAINTS (sensitive product category):
- No before/after body comparisons or transformation imagery
- No body-part focus, enhancement language, or measurement references
- No "results", "works", "changed my life" type messaging
- Product benefit is NEVER stated or implied — only its PRESENCE is shown
- The story/content must be genuinely interesting WITHOUT the product
- ATTAINABLE ASPIRATION body type: visibly fit, toned, athletic — someone who has been training consistently for 1-2 years. NOT a fitness model or competition bodybuilder. NOT an average untrained body. Think "that person at your gym you admire" — lean muscle visible, healthy skin, natural proportions. The body should make the viewer think "I could look like that if I stay consistent" NOT "that is genetically gifted / on steroids"
- For males: visible arm/shoulder definition, V-taper hint, not overly veiny or shredded
- For females: toned legs/glutes, defined arms, flat midsection — fit but feminine, not competition lean`;

function getAntiAdBlock(sensitivity: "normal" | "high"): string {
  return sensitivity === "high"
    ? ANTI_AD_BLOCK + SENSITIVE_EXTRA_BLOCK
    : ANTI_AD_BLOCK;
}

// ─── Demographic detail helpers ───────────────────────────────────────────────

function parseMinAge(ageRange: string): number {
  // Parse "35-45" → 35, or "30+" → 30, or "40" → 40
  const rangeMatch = ageRange.match(/(\d+)\s*[-–]/);
  if (rangeMatch) return parseInt(rangeMatch[1], 10);
  const singleMatch = ageRange.match(/(\d+)/);
  return singleMatch ? parseInt(singleMatch[1], 10) : NaN;
}

function getDemographicAnchors(ageRange: string | undefined): string {
  if (!ageRange) return "";
  const minAge = parseMinAge(ageRange);
  if (isNaN(minAge) || minAge < 30) return "";

  return `The items and details in this scene belong to a person in their ${minAge >= 40 ? "40s" : "30s"}: practical everyday objects, settled lifestyle, nothing trendy or curated. Think real coffee mug (not aesthetic tumbler), simple phone case, reading glasses nearby, actual car keys.`;
}

function getDemographicTextStyle(ageRange: string | undefined): string {
  if (!ageRange) return "";
  const minAge = parseMinAge(ageRange);
  if (isNaN(minAge) || minAge < 30) return "";

  return "Text style: complete sentences, proper punctuation, mature tone. No Gen-Z slang, no excessive emojis, no lowercase-only aesthetic. If iMessage: contact name is a real first name, not a nickname with emojis.";
}

// ─── ENV Template — Environment scenes ──────────────────────────────────────

function assembleEnvPrompt(
  plan: StealthScenePlan,
  productName: string,
  productDescription: string | null | undefined,
  ctx: AudienceContext,
): string {
  const productDesc = productDescription
    ? `${productName} (${productDescription})`
    : productName;

  const demoAnchors = getDemographicAnchors(ctx.ageRange);
  const demoText = getDemographicTextStyle(ctx.ageRange);

  return `Photograph taken with iPhone, unedited, natural lighting.
${plan.composition.settingDetail}.
${demoAnchors ? `${demoAnchors}\n` : ""}Camera angle: ${plan.composition.cameraAngle}. Lighting: ${plan.composition.lighting}. Color mood: ${plan.composition.colorMood}.
Somewhere in this scene, a ${productDesc} happens to be present — not centered, not highlighted, just LEFT THERE as part of everyday clutter. It blends with surrounding objects.
${plan.productPlacement.integrationMethod}. It sits at ${plan.productPlacement.locationInFrame}, ${plan.productPlacement.sizeRelative}. ${plan.productPlacement.labelVisibility}.
The product is partially behind or next to other items. It is NOT the first thing the eye sees — the overall scene composition draws attention first, then the eye may wander to the product.
${plan.textInImage.textType} visible in scene: "${plan.textInImage.textContent}".
Text placement: ${plan.textInImage.textPlacement}. Text style: ${plan.textInImage.textStyle}.
${demoText ? `${demoText}\n` : ""}Cultural details: ${plan.localization.culturalCues.join(", ")}. Language style: ${plan.localization.languageStyle}.
${plan.generation.styleKeywords.join(", ")}.
${PRODUCT_SCALE_BLOCK}
${getAntiAdBlock(ctx.sensitivity ?? "normal")}
Negative: ${plan.generation.antiKeywords.join(", ")}, product centered, product hero shot, product too large, product spotlight.`;
}

// ─── FMT Template — Content format scenes ───────────────────────────────────

function assembleFmtPrompt(
  plan: StealthScenePlan,
  productName: string,
  _productDescription: string | null | undefined,
  ctx: AudienceContext,
): string {
  const demoText = getDemographicTextStyle(ctx.ageRange);

  return `A screenshot of ${plan.composition.settingDetail}.
The content reads: "${plan.textInImage.textContent}".
The product name "${productName}" appears ONCE, casually, as part of normal conversation or text — not highlighted, not bold, not the main topic. ${plan.productPlacement.integrationMethod}.
Product mention placement: ${plan.productPlacement.locationInFrame}. ${plan.productPlacement.labelVisibility}.
The product mention should feel like an AFTERTHOUGHT in the text — the conversation or content is about something else, and the product name just happens to come up naturally.
Text style: ${plan.textInImage.textStyle}. Text placement: ${plan.textInImage.textPlacement}.
${demoText ? `${demoText}\n` : ""}Style: exact platform UI, realistic screen capture. ${plan.generation.styleKeywords.join(", ")}.
Cultural details: ${plan.localization.culturalCues.join(", ")}. Language: ${plan.localization.languageStyle}.
Must look like a real screenshot someone would share organically.
${getAntiAdBlock(ctx.sensitivity ?? "normal")}
Negative: ${plan.generation.antiKeywords.join(", ")}, mockup, template, product name highlighted, product name in bold.`;
}

// ─── STR Template — Story scenes ────────────────────────────────────────────

function assembleStrPrompt(
  plan: StealthScenePlan,
  productName: string,
  productDescription: string | null | undefined,
  ctx: AudienceContext,
): string {
  const productDesc = productDescription
    ? `${productName} (${productDescription})`
    : productName;

  const demoAnchors = getDemographicAnchors(ctx.ageRange);
  const demoText = getDemographicTextStyle(ctx.ageRange);

  return `${plan.composition.settingDetail}.
${demoAnchors ? `${demoAnchors}\n` : ""}The image tells a story: ${plan.surfaceContent.whatViewerSees}. ${plan.surfaceContent.stopScrollHook}.
Camera: ${plan.composition.cameraAngle}. Lighting: ${plan.composition.lighting}. Mood: ${plan.composition.colorMood}.
The STORY is the hero of this image. Somewhere in the scene, a ${productDesc} happens to appear — ${plan.productPlacement.integrationMethod}. It sits at ${plan.productPlacement.locationInFrame}, ${plan.productPlacement.sizeRelative}.
${plan.productPlacement.labelVisibility}. ${plan.productPlacement.naturalJustification}.
The product is NOT the focal point — it is background detail that a careful viewer might notice on second glance.
Text overlay in ${plan.textInImage.textStyle}: "${plan.textInImage.textContent}".
Text placement: ${plan.textInImage.textPlacement}.
${demoText ? `${demoText}\n` : ""}Cultural details: ${plan.localization.culturalCues.join(", ")}. Language: ${plan.localization.languageStyle}.
Looks like organic social media content, ${plan.generation.styleKeywords.join(", ")}.
${PRODUCT_SCALE_BLOCK}
${getAntiAdBlock(ctx.sensitivity ?? "normal")}
Negative: ${plan.generation.antiKeywords.join(", ")}, product centered, product hero shot, product too large.`;
}

// ─── HUM Template — Human-centric scenes ──────────────────────────────────

function assembleHumPrompt(
  plan: StealthScenePlan,
  productName: string,
  productDescription: string | null | undefined,
  ctx: AudienceContext,
): string {
  const productDesc = productDescription
    ? `${productName} (${productDescription})`
    : productName;

  const demoAnchors = getDemographicAnchors(ctx.ageRange);
  const demoText = getDemographicTextStyle(ctx.ageRange);

  return `Candid photograph taken with iPhone, unedited, natural lighting. The PERSON is the subject — this is NOT a product photo.
${plan.composition.settingDetail}.
${demoAnchors ? `${demoAnchors}\n` : ""}Camera angle: ${plan.composition.cameraAngle}. Lighting: ${plan.composition.lighting}. Color mood: ${plan.composition.colorMood}.
The person looks natural, not posed for a camera. Real body, real setting, real moment — like a photo a friend took or a casual selfie.
Body language: relaxed, confident, mid-action or resting naturally. NOT a fitness model pose. NOT looking at camera unless it is a selfie.
${plan.surfaceContent.whatViewerSees}. ${plan.surfaceContent.stopScrollHook}.
FAR in the background, at the edge of frame, or partially hidden behind other objects, a ${productDesc} happens to be in the scene — ${plan.productPlacement.integrationMethod}. Position: ${plan.productPlacement.locationInFrame}. Size: ${plan.productPlacement.sizeRelative}.
${plan.productPlacement.labelVisibility}. ${plan.productPlacement.naturalJustification}.
PRODUCT PLACEMENT SUBTLETY — CRITICAL:
- The product must be EASY TO MISS on first look. A viewer should notice the PERSON first, the SETTING second, and MAYBE discover the product on a third look.
- The product should look like it was LEFT THERE accidentally — not placed for a photo.
- Partially obscured by other objects (towel draped over it, behind a water bottle, half-hidden in an open bag).
- At a natural angle (tilted, turned slightly, not perfectly facing camera).
- At real-world scale — a supplement container is similar in size to a water bottle, inner sachets are the size of a sugar packet.
${plan.textInImage.textType} visible: "${plan.textInImage.textContent}".
Text placement: ${plan.textInImage.textPlacement}. Text style: ${plan.textInImage.textStyle}.
${demoText ? `${demoText}\n` : ""}Cultural details: ${plan.localization.culturalCues.join(", ")}. Language style: ${plan.localization.languageStyle}.
${plan.generation.styleKeywords.join(", ")}.
${PRODUCT_SCALE_BLOCK}
${getAntiAdBlock(ctx.sensitivity ?? "normal")}
HUMAN ELEMENT RULES:
- BODY TYPE: "attainable aspiration" — visibly fit and toned from consistent training. Lean muscle definition visible. NOT a fitness model or bodybuilder. NOT an average untrained body. Think "that person at the gym everyone admires."
- For males: visible arm and shoulder definition, lean torso, V-taper hint. Tank top, stringer, or shirtless in natural context.
- For females: toned legs and glutes, defined arms, fit but feminine curves. Sports bra and leggings, crop top, or swimwear in natural context.
- Natural skin texture, slight imperfections — real pores, natural body hair, maybe a tan line.
- Clothing: worn-in athletic wear, NOT brand-new matching gym set. Faded logo, slightly wrinkled, real.
- Expression: genuine — mid-laugh, focused, tired-but-satisfied, relaxed, checking phone — NOT posing for camera.
- The body makes the viewer STOP SCROLLING. The lifestyle makes them STAY. The product enters memory WITHOUT them noticing.
- Natural gym fluorescent lighting, morning window light, or outdoor sun hitting real muscle. NOT studio, NOT ring light.
- TEXT in this image should be MINIMAL — a short caption, timestamp, or location tag. Real candid photos do NOT have text overlays.
Negative: ${plan.generation.antiKeywords.join(", ")}, professional model, studio lighting, perfect symmetry, posed, stock photo, fitness competition, bodybuilder, competition physique, ring light, overly edited skin, HDR, product centered, product hero shot, product too large, product spotlight, product facing camera perfectly.`;
}

// ─── Main Export — Dispatches by scene category ─────────────────────────────

// ─── Name-Only Template — Product name in text only, no physical product ───

function assembleNameOnlyPrompt(
  plan: StealthScenePlan,
  productName: string,
  ctx: AudienceContext,
): string {
  const demoAnchors = getDemographicAnchors(ctx.ageRange);
  const demoText = getDemographicTextStyle(ctx.ageRange);
  const prefix = plan.sceneId.substring(0, 3);

  // HUM scenes get person-focused prompt, others get scene-focused
  const isHum = prefix === "HUM";

  const personBlock = isHum
    ? `The PERSON is the subject. Real body, real setting, real moment — like a photo a friend took or a casual selfie.
Body language: relaxed, confident, mid-action or resting naturally.
BODY TYPE: "attainable aspiration" — visibly fit and toned. NOT a fitness model. NOT average. Think "that person at the gym everyone admires."
`
    : "";

  return `${isHum ? "Candid photograph taken with iPhone, unedited, natural lighting." : plan.composition.settingDetail + "."}
${demoAnchors ? `${demoAnchors}\n` : ""}Camera angle: ${plan.composition.cameraAngle}. Lighting: ${plan.composition.lighting}. Color mood: ${plan.composition.colorMood}.
${personBlock}${plan.surfaceContent.whatViewerSees}. ${plan.surfaceContent.stopScrollHook}.
IMPORTANT: There is NO physical product in this image. No supplement container, no packaging, no bottle, no pouch.
The product name "${productName}" appears ONLY as text — in a caption, overlay, chat bubble, handwritten note, or screen text.
${plan.textInImage.textType}: "${plan.textInImage.textContent}".
The product name is mentioned casually, as part of a larger piece of text — NOT highlighted, NOT the main topic.
Text placement: ${plan.textInImage.textPlacement}. Text style: ${plan.textInImage.textStyle}.
${demoText ? `${demoText}\n` : ""}Cultural details: ${plan.localization.culturalCues.join(", ")}. Language style: ${plan.localization.languageStyle}.
${plan.generation.styleKeywords.join(", ")}.
${getAntiAdBlock(ctx.sensitivity ?? "normal")}
Negative: ${plan.generation.antiKeywords.join(", ")}, product packaging, supplement container, product bottle, product pouch, product hero shot.`;
}

// ─── Main Export — Dispatches by scene category ─────────────────────────

export function assembleStealthPrompt(
  plan: StealthScenePlan,
  productName: string,
  productDescription: string | null | undefined,
  audienceContext?: AudienceContext,
): string {
  const ctx: AudienceContext = audienceContext ?? {};

  // Name-only plans: no physical product, only text mention
  if (plan.productVisibility === "name-only") {
    return assembleNameOnlyPrompt(plan, productName, ctx);
  }

  const prefix = plan.sceneId.substring(0, 3);

  switch (prefix) {
    case "ENV":
      return assembleEnvPrompt(plan, productName, productDescription, ctx);
    case "FMT":
      return assembleFmtPrompt(plan, productName, productDescription, ctx);
    case "STR":
      return assembleStrPrompt(plan, productName, productDescription, ctx);
    case "HUM":
      return assembleHumPrompt(plan, productName, productDescription, ctx);
    default:
      // Fallback to ENV template for unknown prefixes
      return assembleEnvPrompt(plan, productName, productDescription, ctx);
  }
}
