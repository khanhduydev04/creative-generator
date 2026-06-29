// Server-only: Reference-aware stealth scene planner
// Extracts a "scene blueprint" directly from the CompetitorAdAnalysis
// and generates N variations that ALL follow that exact blueprint
//
// Token optimization: Gemini outputs 1 baseScene (shared fields) + N variations
// (only differing fields), then code merges them into full StealthScenePlan[].
// This cuts output ~47% vs repeating all fields per plan.

import type { CompetitorAdAnalysis } from "@/lib/gemini-reader";
import type { StealthScenePlan } from "@/features/stealth/types";
import { safeJsonParse } from "@/lib/json-utils";
import { geminiGenerate, GEMINI_TEXT_MODEL, Type } from "@/services/geminiClient";

// ─── System Prompt ──────────────────────────────────────────────────────────

const STEALTH_REF_PLANNER_SYSTEM = `You are the world's best stealth advertising creative director.

You are given a detailed analysis of a REFERENCE AD — this analysis IS your scene blueprint.
Your job: output ONE base scene (shared structure) + multiple variations (only the parts that differ).

CORE RULE: THE REFERENCE IS THE TEMPLATE.
Do NOT invent a different scene type. Do NOT change the format, platform look, or content structure.
Every variation must look like it could be the NEXT POST from the same account, or a SIMILAR POST
from a different person in the same community.

THE PSYCHOLOGY:
- 99.99% of ads trigger the AWARE layer → skepticism, scrolling past
- YOUR ads target the UNAWARE layer → product enters memory with zero resistance
- The reference ad succeeded at this. Your variations must use the SAME FORMAT

OUTPUT FORMAT:
You output a JSON object with:
- "baseScene": the shared structure (scene name, product visibility, setting type,
  product integration method, product size, text density pattern, market, language)
- "variations": array of objects, each containing ONLY the fields that differ
  (camera angle, lighting, color mood, setting detail, surface content, product
  location, label angle, text content, cultural cues, style keywords)

WHAT GOES IN baseScene (identical for all):
- sceneName: short name for this scene format
- productVisibility: "physical" or "name-only"
- settingType: the type of space (gym, kitchen, park, etc.)
- productIntegration: how the product naturally ended up in the scene
- productSize: size relative to frame
- textDensity: amount of text (overlay, caption, minimal, none)
- textType: type of text (story overlay, tweet caption, IG caption, etc.)
- textStyle: casual/native style description
- market, languageStyle: target market details

WHAT GOES IN each variation (different per plan):
- cameraAngle, lighting, colorMood, settingDetail
- whatViewerSees, stopScrollHook, emotionalTrigger
- productLocation, labelVisibility, naturalJustification
- textContent, textPlacement
- culturalCues, styleKeywords, antiKeywords

VARIATION GUIDELINES:
- Each variation = a DIFFERENT MOMENT in the same world
- Vary: person (gender/age/ethnicity), text content, camera (5-15° shift),
  lighting warmth, product corner/edge, emotional hook
- Keep SAME: scene format, composition pattern, product prominence, text density, authenticity level

PROPS & OBJECTS — FOLLOW THE REFERENCE ONLY:
- ONLY include props/objects that are PRESENT or LOGICAL in the reference scene.
- If the reference shows a gym with dumbbells → keep gym equipment. Do NOT add keys, coffee, phone.
- If the reference shows a kitchen → keep kitchen items. Do NOT add gym equipment.
- Do NOT invent props to "add authenticity." The reference already defines what belongs in the scene.
- Background objects should be the SAME CATEGORY as the reference, not random additions.

CAMERA & IMAGE QUALITY — iPHONE AESTHETIC:
Every generated image must look like it was shot on an iPhone 14/15 Pro:
- Computational photography look: natural HDR, slight highlight recovery
- Lens: 26mm equivalent (main camera), f/1.78-f/2.2 depth of field
- Slight noise in shadows (ISO 400-800 look), NOT perfectly clean
- Color: slightly warm, natural skin tones, NOT color-graded or filtered
- Focus: sharp on subject, natural background softness (NOT artificial bokeh)
- Imperfections that make it REAL: slightly off-level horizon (1-2°), minor motion
  blur on edges, finger shadow possible, not perfectly centered composition
- For SCREEN CAPTURES (story, tweet, post format): pixel-perfect platform UI,
  correct font rendering, proper spacing, authentic notification bar/time
- NEVER: studio lighting, DSLR shallow DOF, ring light catch-lights, HDR tone-mapping

HUMAN BODY GUIDANCE (for scenes with people) — CONTEXT-DEPENDENT:
This is a CREATINE product. Body type depends on the SCENE CONTEXT:

A) BEFORE/AFTER or TRANSFORMATION scenes (body check, progress, weekly check-in, POV comparison):
   - "BEFORE" side: normal/average body — NOT overweight, but clearly untrained.
     Soft midsection, no visible muscle definition, "skinny-fat" or just average.
     This is the RELATABLE starting point — viewers must think "that looks like me."
   - "AFTER" side: visibly improved — toned, some muscle definition, leaner.
     NOT a fitness model, but clearly someone who has been training 3-6 months.
     The improvement must be BELIEVABLE and ACHIEVABLE, not dramatic.
   - The CONTRAST between before/after is what sells the product's effectiveness.
     If both sides look the same → ad is pointless. The difference must be visible.
   - Product appears on the "after" side or near the person in their current state.

B) SINGLE-MOMENT scenes (gym selfie, lifestyle, workout, candid):
   - "Attainable aspiration" — visibly fit from 1-2 years consistent training.
     NOT a fitness model or bodybuilder. NOT average untrained.
     Think "that person at your gym everyone quietly admires."
   - Males: visible arm/shoulder definition, lean torso, V-taper hint.
   - Females: toned legs/glutes, defined arms, flat midsection, fit but feminine.

C) OFFICE/WORK scenes:
   - Sharp, focused, energetic — someone who clearly takes care of their body and mind.
     Well-groomed, alert posture, clear skin, healthy appearance.

LIGHTING: Natural only — gym fluorescent, window light, outdoor sun.
NOT studio lighting, NOT ring light, NOT professionally edited skin.

PRODUCT IMAGE FIDELITY — ABSOLUTE HIGHEST PRIORITY:
The product in the generated image MUST be IDENTICAL to the attached product reference images.
This is the #1 non-negotiable rule. Getting the product wrong = entire ad is worthless.
- COPY the product EXACTLY as shown in reference images: same packaging shape, same label
  design, same colors, same proportions, same materials, same text on label.
- ZERO creative liberty on the product: do NOT redesign, recolor, reshape, add, or remove
  ANY element of the packaging.
- If reference shows a GREEN POUCH with specific label → it MUST be that exact green pouch.
- If reference shows a JAR → it MUST be that exact jar shape and size.
- The product must look like a REAL PHOTO of the actual product, not an AI interpretation.
- Match exact form factor: gummies pouch ≠ protein tub ≠ pill bottle. Get it RIGHT.
- When in doubt, copy MORE from the product reference images, not less.

PRODUCT FORM RULES:
- GUMMIES: small pouch/jar, fits in one hand. NEVER blender/shaker.
- RESIN: VERY SMALL jar, lip balm size. Near warm drinks. NEVER as powder.
- Placement: <5% of frame, edges/corners/background, readable but angled away.`;

// ─── Optimized Output Schema: baseScene + variations ────────────────────────

const OPTIMIZED_PLAN_SCHEMA = {
  responseMimeType: "application/json" as const,
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      baseScene: {
        type: Type.OBJECT,
        properties: {
          sceneName: { type: Type.STRING },
          productVisibility: { type: Type.STRING, enum: ["physical", "name-only"] },
          settingType: { type: Type.STRING },
          productIntegration: { type: Type.STRING },
          productSize: { type: Type.STRING },
          textDensity: { type: Type.STRING },
          textType: { type: Type.STRING },
          textStyle: { type: Type.STRING },
          market: { type: Type.STRING },
          languageStyle: { type: Type.STRING },
        },
        required: [
          "sceneName", "productVisibility", "settingType", "productIntegration",
          "productSize", "textDensity", "textType", "textStyle", "market", "languageStyle",
        ],
      },
      variations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            cameraAngle: { type: Type.STRING },
            lighting: { type: Type.STRING },
            colorMood: { type: Type.STRING },
            settingDetail: { type: Type.STRING },
            whatViewerSees: { type: Type.STRING },
            stopScrollHook: { type: Type.STRING },
            emotionalTrigger: { type: Type.STRING },
            productLocation: { type: Type.STRING },
            labelVisibility: { type: Type.STRING },
            naturalJustification: { type: Type.STRING },
            textContent: { type: Type.STRING },
            textPlacement: { type: Type.STRING },
            culturalCues: { type: Type.ARRAY, items: { type: Type.STRING } },
            styleKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            antiKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            "cameraAngle", "lighting", "colorMood", "settingDetail",
            "whatViewerSees", "stopScrollHook", "emotionalTrigger",
            "productLocation", "labelVisibility", "naturalJustification",
            "textContent", "textPlacement",
            "culturalCues", "styleKeywords", "antiKeywords",
          ],
        },
      },
    },
    required: ["baseScene", "variations"],
  },
};

// ─── Types for the optimized schema ─────────────────────────────────────────

interface BaseScene {
  sceneName: string;
  productVisibility: "physical" | "name-only";
  settingType: string;
  productIntegration: string;
  productSize: string;
  textDensity: string;
  textType: string;
  textStyle: string;
  market: string;
  languageStyle: string;
}

interface Variation {
  cameraAngle: string;
  lighting: string;
  colorMood: string;
  settingDetail: string;
  whatViewerSees: string;
  stopScrollHook: string;
  emotionalTrigger: string;
  productLocation: string;
  labelVisibility: string;
  naturalJustification: string;
  textContent: string;
  textPlacement: string;
  culturalCues: string[];
  styleKeywords: string[];
  antiKeywords: string[];
}

interface OptimizedPlanOutput {
  baseScene: BaseScene;
  variations: Variation[];
}

// ─── Merge base + variation → full StealthScenePlan ─────────────────────────

function mergeToFullPlan(
  base: BaseScene,
  variation: Variation,
  index: number,
  aspectRatio: string,
): StealthScenePlan {
  return {
    sceneId: `REF_${String(index + 1).padStart(2, "0")}`,
    sceneName: base.sceneName,
    productVisibility: base.productVisibility,
    composition: {
      cameraAngle: variation.cameraAngle,
      lighting: variation.lighting,
      colorMood: variation.colorMood,
      settingDetail: variation.settingDetail,
    },
    surfaceContent: {
      whatViewerSees: variation.whatViewerSees,
      stopScrollHook: variation.stopScrollHook,
      emotionalTrigger: variation.emotionalTrigger,
    },
    productPlacement: {
      locationInFrame: variation.productLocation,
      sizeRelative: base.productSize,
      integrationMethod: base.productIntegration,
      labelVisibility: variation.labelVisibility,
      naturalJustification: variation.naturalJustification,
    },
    textInImage: {
      textType: base.textType,
      textContent: variation.textContent,
      textPlacement: variation.textPlacement,
      textStyle: base.textStyle,
    },
    localization: {
      market: base.market,
      culturalCues: variation.culturalCues,
      languageStyle: base.languageStyle,
    },
    generation: {
      aspectRatio,
      resolution: "1K",
      styleKeywords: variation.styleKeywords,
      antiKeywords: variation.antiKeywords,
    },
  };
}

// ─── Build Scene Blueprint from Analysis ────────────────────────────────────

function buildSceneBlueprint(analysis: CompetitorAdAnalysis): string {
  const visibilityMap: Record<string, string> = {
    hero: "physical — product is main subject",
    prominent: "physical — product clearly visible",
    supporting: "physical — product visible but secondary",
    incidental: "physical — product barely noticeable",
    absent: "name-only — product mentioned in text only",
  };

  return `═══════════════════════════════════════════════════════
SCENE BLUEPRINT (extracted from reference — this IS your template):
═══════════════════════════════════════════════════════

FORMAT: ${analysis.adType} ad
CATEGORY: ${analysis.stealthCategory ?? "general"} scene
FUNNEL STAGE: ${analysis.funnelStage}

CREATIVE CONCEPT: ${analysis.creativeConcept}
This is the CORE IDEA. Every variation must use this same concept.

COMPOSITION (replicate this layout):
${analysis.composition}

VISUAL HIERARCHY (replicate this flow):
${analysis.visualHierarchy}

MOOD & ATMOSPHERE: ${analysis.mood}

PRODUCT PLACEMENT STYLE:
- Visibility: ${visibilityMap[analysis.productVisibility] ?? analysis.productVisibility}
- How it appears: ${analysis.productPresentation}
- Context: ${analysis.propsAndContext}

TEXT APPROACH:
- Density: ${analysis.textDensity}
- Content style: ${analysis.textContent}
- Placement: ${analysis.textPlacement}
- Branding level: ${analysis.brandingLevel}

WHAT MAKES THIS REFERENCE WORK:
${analysis.strengths.map((s) => `✅ ${s}`).join("\n")}

WHAT TO IMPROVE:
${analysis.weaknesses.map((w) => `⚠️ ${w}`).join("\n")}

IMPROVEMENT OPPORTUNITIES:
${analysis.improvementOpportunities.map((o) => `💡 ${o}`).join("\n")}

PIXEL-LEVEL REPLICATION GUIDE:
${analysis.replicationGuide}`;
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

function buildRefAwarePlannerPrompt(
  analysis: CompetitorAdAnalysis,
  productName: string,
  productDescription: string | null | undefined,
  productContext: string,
  audience: { title: string; pain: string; angle: string; emotion: string },
  market: string,
  quantity: number,
  language: string | undefined,
  aspectRatio: string,
  sensitivityLevel: "normal" | "high",
  audienceAgeRange: string | undefined,
): string {
  const blueprint = buildSceneBlueprint(analysis);

  const sensitivityBlock =
    sensitivityLevel === "high"
      ? `
SENSITIVITY MODE: HIGH
- NEVER mention body parts, measurements, enhancement, or transformation in text
- Product benefit is NEVER stated — only its PRESENCE is shown
- Text should be about lifestyle, habits, mindset — NOT results`
      : "";

  const demographicBlock = audienceAgeRange
    ? `
AUDIENCE AGE RANGE: ${audienceAgeRange}
- Text voice: ${parseInt(audienceAgeRange, 10) >= 35 ? "mature, complete sentences, no slang" : "natural for age"}
- Person appearance should match this age range naturally`
    : "";

  return `${blueprint}

PRODUCT (swap the competitor's product for this one):
- Name: ${productName}
- Description: ${productDescription ?? "N/A"}
- Product page context: ${productContext}

TARGET AUDIENCE:
- Profile: ${audience.title}
- Pain points: ${audience.pain}
- Angle: ${audience.angle}
- Desired emotion: ${audience.emotion}
${audienceAgeRange ? `- Age range: ${audienceAgeRange}` : ""}
${sensitivityBlock}
${demographicBlock}

TARGET MARKET: ${market}
LANGUAGE: ${language ?? "English"}
ASPECT RATIO: ${aspectRatio}

TASK: Output 1 baseScene + ${quantity} variations following the SCENE BLUEPRINT above.
- baseScene contains all SHARED fields (same for every variation)
- variations array contains ${quantity} objects with ONLY the differing fields
- All text in the specified LANGUAGE${language && language !== "en-US" ? ` (${language})` : ""}
- Product placement must feel ACCIDENTAL, not arranged
- NOTHING should look like an advertisement`;
}

// ─── Build a summary of the analysis for prompt context ──────────────────────

export function buildAnalysisSummary(analysis: CompetitorAdAnalysis): string {
  return [
    `Reference type: ${analysis.adType} (${analysis.stealthCategory ?? "general"})`,
    `Mood: ${analysis.mood}`,
    `Concept: ${analysis.creativeConcept}`,
    `Product visibility: ${analysis.productVisibility}`,
    `Composition: ${analysis.composition}`,
  ].join(". ");
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function planScenesFromReference(
  userId: string,
  analysis: CompetitorAdAnalysis,
  productName: string,
  productDescription: string | null | undefined,
  productContext: string,
  audience: { title: string; pain: string; angle: string; emotion: string },
  market: string,
  quantity: number,
  language: string | undefined,
  aspectRatio: string,
  sensitivityLevel: "normal" | "high" = "normal",
  audienceAgeRange?: string,
): Promise<StealthScenePlan[]> {
  const prompt = buildRefAwarePlannerPrompt(
    analysis,
    productName,
    productDescription,
    productContext,
    audience,
    market,
    quantity,
    language,
    aspectRatio,
    sensitivityLevel,
    audienceAgeRange,
  );

  console.log(
    `[stealth-ref-planner] Planning ${quantity} variations from reference (category: ${analysis.stealthCategory ?? "auto"}, concept: ${analysis.creativeConcept.substring(0, 60)})`,
  );

  const result = await geminiGenerate(
    userId,
    GEMINI_TEXT_MODEL,
    [{ text: prompt }],
    16384,
    OPTIMIZED_PLAN_SCHEMA,
    STEALTH_REF_PLANNER_SYSTEM,
  );

  const output = safeJsonParse<OptimizedPlanOutput>(result);
  const base = output.baseScene;
  const variations = output.variations ?? [];

  const plans = variations.map((v, i) => mergeToFullPlan(base, v, i, aspectRatio));

  console.log(
    `[stealth-ref-planner] Generated ${plans.length} plans — scene: "${base.sceneName}" (${plans.filter((p) => p.productVisibility === "name-only").length} name-only)`,
  );

  return plans;
}
