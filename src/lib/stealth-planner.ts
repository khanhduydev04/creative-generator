// Server-only: Gemini-powered stealth scene planner
// Generates scene plans for stealth ads using structured output

import type { SceneTemplate, StealthScenePlan } from "@/features/stealth/types";
import { STEALTH_SCENES, getSceneById, getRecommendedSceneIds } from "@/lib/stealth-scenes";
import { safeJsonParse } from "@/lib/json-utils";
import { geminiGenerate, GEMINI_TEXT_MODEL, Type } from "@/services/geminiClient";

// ─── System Prompt ──────────────────────────────────────────────────────────

const STEALTH_PLANNER_SYSTEM = `You are the world's best stealth advertising creative director.

YOUR MISSION: Design image ads that the viewer does NOT recognize as ads.
The product must be present and readable, but the IMAGE must look like
real everyday content — a photo someone took, a screenshot someone shared,
a note someone wrote.

THE PSYCHOLOGY:
- Human brain has 2 layers: AWARE (ad defenses) and UNAWARE (open to input)
- 99.99% of ads trigger the AWARE layer → skepticism, scrolling past
- YOUR ads target the UNAWARE layer → product enters memory with zero resistance
- You are a MAGICIAN: the trick works because they don't know it's a trick

SCENE DESIGN PRINCIPLES:
1. RELATABILITY > ASPIRATION — everyday moments beat aspirational lifestyle
2. IMPERFECTION = AUTHENTICITY — slightly messy, real, lived-in
3. TEXT AS CONTENT, NOT COPY — the text should be something someone would
   actually write, not marketing language
4. PRODUCT AS EXTRA, NOT HERO — product is "accidentally left there" not "placed for the photo".
   The product should be EASY TO MISS on first glance. A viewer scrolling fast might not
   even notice it. Only on a second or third look do they register the product name.
   Think of how a water bottle or phone charger appears in someone's photo — nobody
   placed it there on purpose, it just happens to be in frame.
5. CULTURAL SPECIFICITY — details must match the target market exactly
6. STOP-SCROLL via STORY — the image should make someone curious about
   the story/context, not about the product
7. HUMAN BODY = SCROLL STOPPER — people stop for PEOPLE. A real person
   in a real moment is the strongest attention hook. The body/person is
   what catches the eye; the product is what the subconscious records.
8. LIFESTYLE ENVY > PRODUCT ENVY — viewer should think "I want that life"
   not "I want that product". The product just happens to be part of that life.

SENSITIVITY CALIBRATION:
When the product relates to body image, weight, beauty, fitness supplements,
body enhancement, or personal insecurity:
- NEVER reference the benefit directly in any visible text
- Product must appear as "just another item someone owns"
- Text content must be about LIFESTYLE or STORY, never about RESULTS or TRANSFORMATION
- Zero before/after body comparisons or implications
- The viewer should think "this person has their life together"
  NOT "this person used X to fix Y"
- The emotional hook must come from the STORY/CONTENT, not from the product promise
- People with body-related goals have the STRONGEST ad radar — extra stealth required

HUMAN BODY GUIDANCE (for HUM scenes):
The body is the SCROLL STOPPER. The product is the SUBCONSCIOUS MESSAGE.
- Body type: "attainable aspiration" — visibly fit, toned, athletic from 1-2 years of
  consistent training. NOT a fitness model or bodybuilder. NOT an average untrained body.
  Think "that person at your gym everyone quietly admires."
- For males: visible arm/shoulder definition, lean torso, V-taper hint, natural vascularity.
  Not overly shredded or veiny. Wearing tank top, stringer, or shirtless in natural contexts.
- For females: toned legs/glutes, defined arms, flat midsection, fit but feminine curves.
  Not competition lean. Wearing sports bra + leggings, crop top, or swimwear in natural contexts.
- CRITICAL: the body should make viewers think "I want to look like that, and it seems achievable"
  This creates a POSITIVE ASSOCIATION with whatever else is in the frame (the product).
- Natural lighting hitting real muscle is key — gym fluorescent, morning window light, outdoor sun.
  NOT studio lighting, NOT ring light, NOT professionally edited skin.

DEMOGRAPHIC AUTHENTICITY:
When targeting middle-aged audiences (30+, 35+, 40+, etc.):
- Items in scenes must match this age group: reading glasses, simple phone case,
  sedan/SUV keys, practical water bottle, real coffee mug — NOT aesthetic gadgets,
  ring lights, or trendy accessories
- Text voice: mature, understated, complete sentences, proper punctuation
- Slight self-deprecating humor works. Gen-Z slang does NOT.
- Platform authenticity: iMessage, Facebook, Reddit, Notes App are natural.
  TikTok aesthetics, photo dumps, starter pack memes are NOT.
- Life stage cues: career stability, family, health awareness, mortgage,
  weekend routines, established social circles
- Content they actually consume: health articles, peer recommendations,
  "what worked for me" stories, life reflection posts

PRODUCT IMAGE FIDELITY:
The generated image MUST show the product with its EXACT real packaging — same shape,
same colors, same label design as described in the product description and shown in product images.
Do NOT invent or redesign the product packaging. If the product is a black pouch with gold text,
it must appear as a black pouch with gold text. Getting the packaging wrong destroys credibility.

PRODUCT FORM AWARENESS — CRITICAL:
Match each scene to HOW the product is actually used in real life.
Read the product description carefully to determine the form.

- GUMMIES / CHEWABLES: eaten by hand like candy from a small jar or pouch.
  Natural actions: popping 2-3 gummies into mouth, holding open jar, jar on desk/counter.
  The jar/pouch is SMALL — fits in one hand, similar size to a pill bottle.
  NEVER put in a blender, shaker, or mixed into drinks. NEVER show as powder.
  Great contexts: eating at gym, on desk during work, morning counter, in hand casually.

- RESIN (shilajit gold resin): thick sticky substance in a small jar, taken with a tiny spoon or
  dissolved in warm water/milk/tea. The jar is VERY SMALL — about the size of a lip balm container.
  Natural actions: small jar open with tiny spoon, near a warm drink (tea, warm milk, warm water).
  NEVER show as powder, gummies, or capsules. NEVER put in blender.
  Great contexts: next to a warm mug, on nightstand, on bathroom counter, morning routine.

- POWDER: scooped into shakers, smoothies, or water. Can be shown being mixed.
- CAPSULES / PILLS: swallowed with water. Show near a glass of water, in a pill organizer.
- LIQUID: poured, drunk directly.

If the product description says "gummies", NEVER plan a scene where the product is blended or mixed.
If it says "resin", show it near warm drinks with a tiny spoon, NEVER in a shaker.
A viewer who knows the product will INSTANTLY detect if the usage context is wrong — this destroys credibility.

PRODUCT PLACEMENT — SUBTLETY RULES:
For the productPlacement fields in each plan:
- sizeRelative: ALWAYS describe as small relative to scene. Use terms like
  "occupies less than 5% of frame", "smaller than the water bottle nearby",
  "about the size of a coffee mug in the background". NEVER "prominent" or "large".
- locationInFrame: Prefer edges, corners, background planes. Use terms like
  "bottom-left corner", "far background on counter", "half-visible at frame edge",
  "partially behind the towel on the bench". NEVER "center" or "foreground focus".
- integrationMethod: Describe HOW the product ended up there naturally. Example:
  "left on the counter after morning use" not "placed prominently on counter".
  "still in the open gym bag from earlier" not "displayed next to the person".
- labelVisibility: The label should be readable but not perfectly angled toward camera.
  Use terms like "label partially visible at an angle", "brand name readable but
  product is turned slightly away from camera", "label facing sideways, readable
  if the viewer looks closely". NEVER "label facing directly at camera".

OUTPUT: Return a JSON array of scene plans following the schema provided.
Each plan must include composition, surfaceContent, productPlacement,
textInImage, localization, and generation fields.`;

// ─── Structured Output Schema ───────────────────────────────────────────────

const SCENE_PLAN_SCHEMA = {
  responseMimeType: "application/json" as const,
  responseSchema: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        sceneId: { type: Type.STRING },
        sceneName: { type: Type.STRING },
        productVisibility: {
          type: Type.STRING,
          enum: ["physical", "name-only"],
        },
        composition: {
          type: Type.OBJECT,
          properties: {
            cameraAngle: { type: Type.STRING },
            lighting: { type: Type.STRING },
            colorMood: { type: Type.STRING },
            settingDetail: { type: Type.STRING },
          },
          required: ["cameraAngle", "lighting", "colorMood", "settingDetail"],
        },
        surfaceContent: {
          type: Type.OBJECT,
          properties: {
            whatViewerSees: { type: Type.STRING },
            stopScrollHook: { type: Type.STRING },
            emotionalTrigger: { type: Type.STRING },
          },
          required: ["whatViewerSees", "stopScrollHook", "emotionalTrigger"],
        },
        productPlacement: {
          type: Type.OBJECT,
          properties: {
            locationInFrame: { type: Type.STRING },
            sizeRelative: { type: Type.STRING },
            integrationMethod: { type: Type.STRING },
            labelVisibility: { type: Type.STRING },
            naturalJustification: { type: Type.STRING },
          },
          required: [
            "locationInFrame",
            "sizeRelative",
            "integrationMethod",
            "labelVisibility",
            "naturalJustification",
          ],
        },
        textInImage: {
          type: Type.OBJECT,
          properties: {
            textType: { type: Type.STRING },
            textContent: { type: Type.STRING },
            textPlacement: { type: Type.STRING },
            textStyle: { type: Type.STRING },
          },
          required: ["textType", "textContent", "textPlacement", "textStyle"],
        },
        localization: {
          type: Type.OBJECT,
          properties: {
            market: { type: Type.STRING },
            culturalCues: { type: Type.ARRAY, items: { type: Type.STRING } },
            languageStyle: { type: Type.STRING },
          },
          required: ["market", "culturalCues", "languageStyle"],
        },
        generation: {
          type: Type.OBJECT,
          properties: {
            aspectRatio: { type: Type.STRING },
            resolution: { type: Type.STRING },
            styleKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            antiKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["aspectRatio", "resolution", "styleKeywords", "antiKeywords"],
        },
      },
      required: [
        "sceneId",
        "sceneName",
        "productVisibility",
        "composition",
        "surfaceContent",
        "productPlacement",
        "textInImage",
        "localization",
        "generation",
      ],
    },
  },
};

// ─── Prompt Builder ─────────────────────────────────────────────────────────

function buildPlannerPrompt(
  productName: string,
  productDescription: string | null | undefined,
  productContext: string,
  audience: { title: string; pain: string; angle: string; emotion: string },
  scenes: "auto" | string[],
  market: string,
  quantity: number,
  language: string | undefined,
  aspectRatio: string,
  sensitivityLevel: "normal" | "high",
  audienceAgeRange: string | undefined,
  allScenes?: SceneTemplate[],
): string {
  const scenesSource = allScenes ?? STEALTH_SCENES;

  // ── Scene section (auto vs manual) ──────────────────────────────
  const sceneSection =
    scenes === "auto"
      ? buildAutoSceneSection(audience, audienceAgeRange, scenesSource)
      : `SCENE SELECTION: Use these scenes: ${scenes.join(", ")}
${scenes.map((id) => {
  const scene = getSceneById(id, scenesSource);
  return scene ? `- ${scene.id}: ${scene.name} — ${scene.description} (placement: ${scene.placementMethod})` : `- ${id}: (unknown)`;
}).join("\n")}`;

  // ── Sensitivity block ───────────────────────────────────────────
  const sensitivityBlock =
    sensitivityLevel === "high"
      ? `
SENSITIVITY MODE: HIGH
This product relates to body image / physical enhancement / personal insecurity.
Apply maximum stealth:
- NEVER mention body parts, measurements, enhancement, or transformation in text
- NEVER use before/after framing for body or appearance
- Product benefit is NEVER stated — only its PRESENCE is shown
- The story/content must be genuinely interesting WITHOUT the product
- Text should be about lifestyle, habits, mindset — NOT results
- A viewer who removes the product from the scene should still find the content engaging
- For HUM scenes: show people who LOOK GREAT living their lives naturally.
  The viewer sees a fit/attractive person and WANTS that lifestyle.
  The product is just casually present — the subconscious connects
  "this person looks great" + "this product is part of their life" WITHOUT
  any explicit claim being made. This is the most powerful stealth technique.
- Body shown in HUM scenes: natural, healthy, attainable — NOT bodybuilder or fitness model.
  Think "that person at the gym who looks great" not "professional athlete".
- PRODUCT VISIBILITY MIX: For HIGH sensitivity, at least 30% of plans should use
  productVisibility: "name-only" — the product name appears ONLY in text (caption, chat,
  note, overlay) but NO physical product is shown in the image. This is the MAXIMUM
  stealth level. The remaining plans use productVisibility: "physical" with very subtle placement.
  For "name-only" plans, the productPlacement fields should describe the text-based mention,
  not a physical placement.`
      : "";

  // ── Demographic block ───────────────────────────────────────────
  const demographicBlock = audienceAgeRange
    ? `
AUDIENCE AGE RANGE: ${audienceAgeRange}
Calibrate ALL visual and text details for this demographic:
- Object styling must match age group (practical items, not trendy)
- Text voice: ${parseInt(audienceAgeRange, 10) >= 35 ? "mature, complete sentences, no slang" : "natural for age"}
- Scene props: ${parseInt(audienceAgeRange, 10) >= 35 ? "reading glasses, real coffee cups, sedan keys, simple phone — NOT aesthetic gadgets or Gen-Z items" : "age-appropriate items"}
- Emotional hooks: ${parseInt(audienceAgeRange, 10) >= 35 ? "wisdom sharing, peer experience, life reflection, quiet discipline" : "relatable, authentic"}`
    : "";

  return `PRODUCT:
- Name: ${productName}
- Description: ${productDescription ?? "N/A"}
- Product page context: ${productContext}

TARGET AUDIENCE:
- Profile: ${audience.title}
- Pain points: ${audience.pain}
- Angle: ${audience.angle}
- Desired emotion: ${audience.emotion}
${audienceAgeRange ? `- Age range: ${audienceAgeRange}` : ""}

${sceneSection}
${sensitivityBlock}
${demographicBlock}

TARGET MARKET: ${market}
LANGUAGE: ${language ?? "English"}
ASPECT RATIO: ${aspectRatio}

QUANTITY: Generate ${quantity} unique scene plans.

Rules:
- Each plan must use a DIFFERENT scene or a meaningfully different variation
- Vary the camera angles, lighting, and emotional hooks
- At least 35% should be HUMAN-CENTRIC scenes (HUM — person is the main subject, product incidental)
- At least 25% should be ENVIRONMENT scenes (ENV — product physically in frame)
- At least 20% should be CONTENT FORMAT scenes (FMT — product in text/screenshot)
- Remaining can be STORY scenes (STR)
- For HUM scenes: the PERSON is the hero. Show real bodies, real moments, real lifestyle.
  The viewer stops scrolling because of the PERSON/STORY, not the product.
  Product is visible but secondary — it is just something this person owns.
  BODY TYPE: "attainable aspiration" — visibly fit/toned from consistent training (1-2 years).
  NOT a fitness model. NOT an average body. Think "that person at the gym you admire."
  For males: visible arm/shoulder definition, lean, V-taper hint.
  For females: toned legs/glutes, defined arms, fit but feminine.
- Product name should be readable but NOT prominent. Plan for these placement techniques:
  * Partially obscured: towel draped over container, half-hidden in open bag, behind a water bottle
  * Angled away: product turned 30-45 degrees from camera, not perfectly facing lens
  * Edge placement: bottom-left corner, far background, periphery of frame
  * Scale accuracy: supplement container = water bottle size, inner sachets = sugar packet size
  * Natural context: product is WHERE IT WOULD REALLY BE (gym floor, kitchen counter among other items, inside bag) not where a photographer would PLACE it
- For ENV/FMT/STR scenes: include substantial text content (text heavy)
- For HUM scenes: text should be MINIMAL — a short IG caption, time stamp, or small watermark-style text.
  Real candid photos do NOT have text overlays. Heavy text on a candid photo = instant ad detection.
  The textInImage field should contain caption-style text (like an IG caption below the photo)
  or a subtle timestamp/location tag, NOT a text overlay on the image.
- Product must be clearly visible or mentioned (product heavy requirement)
- NOTHING should look like an advertisement
- All text content must be in the specified LANGUAGE${language && language !== "en-US" ? ` (${language})` : ""}
- Use the specified ASPECT RATIO for all plans`;
}

/**
 * Builds the auto scene selection section with audience-aware priority hints.
 */
function buildAutoSceneSection(
  audience: { title: string; pain: string; angle: string; emotion: string },
  audienceAgeRange: string | undefined,
  scenesSource: SceneTemplate[],
): string {
  const audienceKeywords = [
    audience.title,
    audience.pain,
    audience.angle,
    audience.emotion,
  ];
  const { topPick, acceptable, avoid } = getRecommendedSceneIds(
    audienceKeywords,
    audienceAgeRange,
    scenesSource,
  );

  const allScenesListing = scenesSource.map(
    (s) => `- ${s.id}: ${s.name} — ${s.description} (placement: ${s.placementMethod})`,
  ).join("\n");

  let priorityHints = "";
  if (topPick.length > 0) {
    priorityHints = `

SCENE PRIORITY (based on audience analysis):
- TOP PICKS (highest affinity — use these first): ${topPick.join(", ")}
- ACCEPTABLE (good secondary choices): ${acceptable.join(", ")}
- AVOID (low affinity for this audience): ${avoid.join(", ")}
Prioritize TOP PICKS and ACCEPTABLE scenes. Only use AVOID scenes if quantity demands it.`;
  }

  return `SCENE SELECTION: AUTO — choose the best mix of scenes for this product + audience.
Available scenes:
${allScenesListing}${priorityHints}`;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function planStealthScenes(
  userId: string,
  productName: string,
  productDescription: string | null | undefined,
  productContext: string,
  audience: { title: string; pain: string; angle: string; emotion: string },
  scenes: "auto" | string[],
  market: string,
  quantity: number,
  language: string | undefined,
  aspectRatio: string,
  sensitivityLevel: "normal" | "high" = "normal",
  audienceAgeRange?: string,
  allScenes?: SceneTemplate[],
): Promise<StealthScenePlan[]> {
  const prompt = buildPlannerPrompt(
    productName,
    productDescription,
    productContext,
    audience,
    scenes,
    market,
    quantity,
    language,
    aspectRatio,
    sensitivityLevel,
    audienceAgeRange,
    allScenes,
  );

  console.log(
    `[stealth-planner] Planning ${quantity} scenes (${scenes === "auto" ? "auto" : scenes.length + " selected"})`,
  );

  const result = await geminiGenerate(
    userId,
    GEMINI_TEXT_MODEL,
    [{ text: prompt }],
    16384,
    SCENE_PLAN_SCHEMA,
    STEALTH_PLANNER_SYSTEM,
  );

  const rawPlans = safeJsonParse<StealthScenePlan[]>(result);
  // Defensive default: if Gemini omits productVisibility, default to "physical"
  const plans = rawPlans.map((p) => ({
    ...p,
    productVisibility: p.productVisibility ?? ("physical" as const),
  }));
  console.log(
    `[stealth-planner] Generated ${plans.length} scene plans (${plans.filter((p) => p.productVisibility === "name-only").length} name-only)`,
  );

  return plans;
}
