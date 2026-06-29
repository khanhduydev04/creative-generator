// Stealth Ads scene library — 47 scene templates across 4 categories
// Static data only — safe for client and server imports

import type { SceneTemplate } from "@/features/stealth/types";

export const STEALTH_SCENES: SceneTemplate[] = [
  // ─── ENVIRONMENT SCENES (ENV) — Product placed IN a real setting ────────
  {
    id: "ENV_01",
    category: "ENV",
    name: "Morning Counter",
    description: "Kitchen counter morning routine shot",
    placementMethod: "Product bottle among coffee, keys, phone",
    bestForProducts: ["supplements", "gummies", "powder", "drinks"],
    bestForAudiences: ["health-conscious", "busy professional", "fitness"],
  },
  {
    id: "ENV_02",
    category: "ENV",
    name: "Bathroom Shelf",
    description: "Bathroom medicine cabinet / shelf",
    placementMethod: "Product among skincare, toothbrush, vitamins",
    bestForProducts: ["supplements", "resin", "capsules", "skincare"],
    bestForAudiences: ["wellness", "skincare enthusiast", "self-care"],
  },
  {
    id: "ENV_03",
    category: "ENV",
    name: "Gym Bag Flat Lay",
    description: "Top-down contents of a gym bag",
    placementMethod: "Product among water bottle, earbuds, towel",
    bestForProducts: ["supplements", "protein", "pre-workout", "energy"],
    bestForAudiences: ["fitness", "gym-goer", "athlete"],
  },
  {
    id: "ENV_04",
    category: "ENV",
    name: "Office Desk",
    description: "Work desk overhead or angle shot",
    placementMethod: "Product next to laptop, notebook, coffee",
    bestForProducts: ["supplements", "nootropics", "focus", "energy"],
    bestForAudiences: ["busy professional", "remote worker", "student"],
  },
  {
    id: "ENV_05",
    category: "ENV",
    name: "Travel Essentials",
    description: "Packing or flat lay of travel items",
    placementMethod: "Product in carry-on essentials layout",
    bestForProducts: ["supplements", "capsules", "travel-size", "portable"],
    bestForAudiences: ["traveler", "busy professional", "digital nomad"],
  },
  {
    id: "ENV_06",
    category: "ENV",
    name: "Nightstand",
    description: "Bedside table scene",
    placementMethod: "Product next to book, glasses, phone charger",
    bestForProducts: ["supplements", "sleep aid", "melatonin", "resin"],
    bestForAudiences: ["wellness", "sleep-focused", "self-care"],
  },
  {
    id: "ENV_07",
    category: "ENV",
    name: "Kitchen Shelf Aesthetic",
    description: "Organized pantry / supplement shelf",
    placementMethod: "Product as part of curated collection",
    bestForProducts: ["supplements", "powder", "gummies", "vitamins"],
    bestForAudiences: ["health-conscious", "organized", "wellness"],
  },
  {
    id: "ENV_08",
    category: "ENV",
    name: "Fridge Door Interior",
    description: "Open fridge with organized contents",
    placementMethod: "Product on fridge door shelf",
    bestForProducts: ["drinks", "probiotics", "liquid supplements"],
    bestForAudiences: ["health-conscious", "meal-prep", "fitness"],
  },
  {
    id: "ENV_09",
    category: "ENV",
    name: "Grocery Haul",
    description: "Spread of items from shopping trip",
    placementMethod: "Product mixed with groceries on counter",
    bestForProducts: ["supplements", "food items", "drinks", "snacks"],
    bestForAudiences: ["health-conscious", "budget shopper", "meal-prep"],
  },
  {
    id: "ENV_10",
    category: "ENV",
    name: "Car Cup Holder",
    description: "Dashboard / console area of car",
    placementMethod: "Product in cup holder or passenger seat",
    bestForProducts: ["drinks", "supplements", "portable items"],
    bestForAudiences: ["busy professional", "commuter", "on-the-go"],
  },

  // ─── CONTENT FORMAT SCENES (FMT) — Product embedded in "content" ───────
  {
    id: "FMT_01",
    category: "FMT",
    name: "iMessage Thread",
    description: "Text conversation screenshot",
    placementMethod: "Product mentioned casually in chat",
    bestForProducts: ["any"],
    bestForAudiences: ["young adult", "millennial", "gen-z"],
  },
  {
    id: "FMT_02",
    category: "FMT",
    name: "Notes App Screenshot",
    description: "iPhone Notes app with a personal list",
    placementMethod: "Product name in a routine / habit list",
    bestForProducts: ["supplements", "wellness", "skincare"],
    bestForAudiences: ["organized", "wellness", "self-improvement"],
  },
  {
    id: "FMT_03",
    category: "FMT",
    name: "Reddit Post Style",
    description: "Reddit-style post with comments",
    placementMethod: "Product mentioned as discovery / recommendation",
    bestForProducts: ["any"],
    bestForAudiences: ["tech-savvy", "researcher", "reddit user"],
  },
  {
    id: "FMT_04",
    category: "FMT",
    name: "Tweet / X Post",
    description: "Tweet format with engagement metrics",
    placementMethod: "Product as personal anecdote in tweet",
    bestForProducts: ["any"],
    bestForAudiences: ["young adult", "professional", "thought leader"],
  },
  {
    id: "FMT_05",
    category: "FMT",
    name: "Handwritten Note",
    description: "Journal / sticky note / handwritten list",
    placementMethod: "Product name written among daily notes",
    bestForProducts: ["supplements", "wellness", "self-care"],
    bestForAudiences: ["journaler", "self-care", "mindful"],
  },
  {
    id: "FMT_06",
    category: "FMT",
    name: "Calendar Screenshot",
    description: "Weekly calendar / planner view",
    placementMethod: "Product as part of daily routine schedule",
    bestForProducts: ["supplements", "wellness routines"],
    bestForAudiences: ["organized", "busy professional", "planner"],
  },
  {
    id: "FMT_07",
    category: "FMT",
    name: "Shopping List",
    description: "Checklist-style shopping list",
    placementMethod: "Product name among grocery items",
    bestForProducts: ["food items", "supplements", "household"],
    bestForAudiences: ["shopper", "organized", "family"],
  },
  {
    id: "FMT_08",
    category: "FMT",
    name: "Search History",
    description: "Browser search history screenshot",
    placementMethod: "Product-related searches among others",
    bestForProducts: ["any"],
    bestForAudiences: ["curious", "researcher", "health-conscious"],
  },
  {
    id: "FMT_09",
    category: "FMT",
    name: "Photo Dump Caption",
    description: "Instagram multi-photo style with caption",
    placementMethod: "Product visible in one of the dump photos",
    bestForProducts: ["any physical product"],
    bestForAudiences: ["gen-z", "instagram user", "visual"],
  },
  {
    id: "FMT_10",
    category: "FMT",
    name: "Recipe Card",
    description: "Recipe or meal prep card",
    placementMethod: "Product as ingredient or accompaniment",
    bestForProducts: ["food items", "supplements", "powder", "drinks"],
    bestForAudiences: ["foodie", "meal-prep", "health-conscious"],
  },

  // ─── HUMAN-CENTRIC SCENES (HUM) — Person is the hero, product is incidental ─
  {
    id: "HUM_01",
    category: "HUM",
    name: "Gym Mirror Selfie",
    description: "Casual gym mirror selfie, natural lighting, real gym setting",
    placementMethod: "Small product jar/pouch visible in open gym bag or on bench behind person — a tiny detail in the background",
    bestForProducts: ["gummies", "resin", "supplements", "capsules", "energy"],
    bestForAudiences: ["fitness", "gym-goer", "muscle-building", "body transformation"],
  },
  {
    id: "HUM_02",
    category: "HUM",
    name: "Progress Check Mirror",
    description: "Casual mirror check — person lifting shirt slightly or flexing lightly, checking own progress",
    placementMethod: "Small product jar on bathroom counter or bedroom dresser behind person — barely visible among personal items",
    bestForProducts: ["gummies", "resin", "supplements", "capsules"],
    bestForAudiences: ["fitness", "muscle-building", "body transformation", "self-improvement"],
  },
  {
    id: "HUM_03",
    category: "HUM",
    name: "Kitchen Meal Prep",
    description: "Person in athletic wear cooking or prepping food — product is NOT an ingredient, it was left on the counter from earlier morning use",
    placementMethod: "Product sitting at the far end of kitchen counter near water glass, clearly separate from cooking ingredients — left there from morning supplement routine",
    bestForProducts: ["supplements", "protein", "creatine", "vitamins"],
    bestForAudiences: ["fitness", "meal-prep", "health-conscious", "muscle-building"],
  },
  {
    id: "HUM_04",
    category: "HUM",
    name: "Post-Workout Glow",
    description: "Sweaty person with towel, natural post-exercise look, sitting or standing near their belongings",
    placementMethod: "Small product jar/pouch visible in open gym bag nearby, or on the bench next to water bottle and phone",
    bestForProducts: ["supplements", "gummies", "resin", "capsules", "energy"],
    bestForAudiences: ["fitness", "gym-goer", "athlete", "body transformation"],
  },
  {
    id: "HUM_05",
    category: "HUM",
    name: "Car After Gym",
    description: "Person sitting in parked car right after gym session — sweaty, seatbelt off, checking phone or resting with eyes closed, gym bag on passenger seat",
    placementMethod: "Small product jar visible inside open gym bag on passenger seat, or in the center console among keys and water bottle",
    bestForProducts: ["gummies", "resin", "supplements", "capsules", "energy"],
    bestForAudiences: ["gym-goer", "fitness", "busy professional", "commuter", "body transformation"],
  },
  {
    id: "HUM_06",
    category: "HUM",
    name: "Couple Workout",
    description: "Two people exercising together, partner dynamic",
    placementMethod: "Small product jar on shared bench between water bottles, or in one person's open bag nearby",
    bestForProducts: ["gummies", "resin", "supplements", "capsules", "energy"],
    bestForAudiences: ["couples", "fitness", "social fitness", "relationship goals"],
  },
  {
    id: "HUM_07",
    category: "HUM",
    name: "Morning Supplement Routine",
    description: "Person in underwear or shorts at kitchen counter, warm morning light, one hand holding water glass or warm drink, small supplement jar on counter — the daily wellness ritual",
    placementMethod: "Small product jar on counter next to water glass or mug — person is mid-action of their daily supplement routine, maybe a gummy in hand or resin jar open with small spoon",
    bestForProducts: ["gummies", "resin", "supplements", "capsules", "vitamins"],
    bestForAudiences: ["fitness", "morning routine", "health-conscious", "self-discipline", "body-confident"],
  },
  {
    id: "HUM_08",
    category: "HUM",
    name: "Quick Gummy Snack at Gym",
    description: "Person at gym casually popping gummies into mouth from a small jar — like eating a quick snack between activities, relaxed, one hand holding open jar",
    placementMethod: "Small product jar in person's hand, open, with a few gummies visible — person is mid-action of eating them casually like candy. Jar is small enough to fit in one hand",
    bestForProducts: ["gummies", "chewables", "supplements"],
    bestForAudiences: ["gym-goer", "fitness", "muscle-building", "casual supplement user"],
  },
  {
    id: "HUM_09",
    category: "HUM",
    name: "Getting Ready Mirror",
    description: "Person at bathroom mirror getting ready for the day — product is on counter next to water glass, NOT mixed with grooming/skincare items, clearly a separate supplement corner",
    placementMethod: "Product on bathroom counter next to a glass of water, separate from grooming items — part of the morning supplement routine",
    bestForProducts: ["supplements", "creatine", "vitamins", "capsules", "gummies"],
    bestForAudiences: ["self-care", "body-confident", "morning routine", "fitness"],
  },
  {
    id: "HUM_10",
    category: "HUM",
    name: "Living Room Workout",
    description: "Person doing home exercise, dumbbells, mat on floor",
    placementMethod: "Small product jar on coffee table among water bottle and phone, or on the floor near equipment — part of the person's workout setup",
    bestForProducts: ["gummies", "resin", "supplements", "capsules"],
    bestForAudiences: ["home fitness", "busy professional", "parent", "at-home workout"],
  },
  {
    id: "HUM_11",
    category: "HUM",
    name: "Gym Action Shot",
    description: "Person mid-exercise — squatting, deadlifting, or pressing — body under effort, good form",
    placementMethod: "Small product jar barely visible on the bench in background, or peeking out of a gym bag at the edge of frame",
    bestForProducts: ["gummies", "resin", "supplements", "capsules", "energy"],
    bestForAudiences: ["gym-goer", "muscle-building", "powerlifting", "strength training"],
  },
  {
    id: "HUM_12",
    category: "HUM",
    name: "Warm Drink Ritual",
    description: "Person holding warm mug (tea, milk, warm water) in cozy setting — morning or evening. For resin: small jar open nearby with tiny spoon. For gummies: jar on table next to the mug",
    placementMethod: "Product jar on table or counter beside the warm drink — for resin, the jar is open with a small spoon/stick, implying it was just dissolved into the drink. For gummies, jar is simply nearby as part of the routine",
    bestForProducts: ["resin", "gummies", "supplements", "wellness"],
    bestForAudiences: ["wellness", "self-care", "morning routine", "evening routine", "health-conscious"],
  },
  {
    id: "HUM_13",
    category: "HUM",
    name: "Friend Group Gym",
    description: "Small group at gym, social fitness moment — maybe someone sharing gummies with friends",
    placementMethod: "Small product jar on bench, or one person offering gummies from an open jar to the group — casual sharing moment",
    bestForProducts: ["gummies", "supplements", "capsules", "energy"],
    bestForAudiences: ["social fitness", "gym-goer", "community", "young adult"],
  },
  {
    id: "HUM_14",
    category: "HUM",
    name: "Shirtless Morning Routine",
    description: "Person without shirt making coffee or breakfast, casual morning light, domestic setting",
    placementMethod: "Small product jar on kitchen counter among coffee mug, phone, and keys — just another item in the morning clutter",
    bestForProducts: ["gummies", "resin", "supplements", "vitamins", "energy"],
    bestForAudiences: ["fitness", "lifestyle", "body-confident", "morning routine", "boyfriend material"],
  },
  {
    id: "HUM_15",
    category: "HUM",
    name: "Locker Room Candid",
    description: "Person at gym locker, packing or unpacking gear",
    placementMethod: "Small product jar in locker shelf or being tossed into gym bag — compact enough to fit in any bag pocket",
    bestForProducts: ["gummies", "resin", "supplements", "capsules"],
    bestForAudiences: ["gym-goer", "fitness", "muscle-building", "athlete"],
  },

  {
    id: "HUM_16",
    category: "HUM",
    name: "Gym Outfit Check",
    description: "Mirror selfie checking gym outfit before heading out — body visible through fitted workout clothes, gym bag packed on bed or floor",
    placementMethod: "Small product jar peeking out of open gym bag in the background, or on nightstand next to keys and phone — about to be grabbed on the way out",
    bestForProducts: ["gummies", "resin", "supplements", "capsules"],
    bestForAudiences: ["fitness", "fashion-fitness", "gym-goer", "body-confident", "instagram"],
  },
  {
    id: "HUM_17",
    category: "HUM",
    name: "Between Sets Rest",
    description: "Person sitting on gym bench between sets, phone in hand, relaxed, slightly sweaty",
    placementMethod: "Small product jar/pouch visible on bench next to water bottle and phone, or peeking out of open gym bag on the floor",
    bestForProducts: ["gummies", "supplements", "resin", "capsules", "energy"],
    bestForAudiences: ["gym-goer", "muscle-building", "fitness", "strength training"],
  },

  // ─── STORY SCENES (STR) — Product woven into a narrative ───────────────
  {
    id: "STR_01",
    category: "STR",
    name: "Before/After Routine",
    description: '"My morning 6 months ago vs now" split',
    placementMethod: 'Product visible in "after" side',
    bestForProducts: ["supplements", "wellness", "fitness"],
    bestForAudiences: ["self-improvement", "transformation", "fitness"],
  },
  {
    id: "STR_02",
    category: "STR",
    name: "Honest Review Aesthetic",
    description: "Cluttered desk with pros/cons sticky notes",
    placementMethod: 'Product as subject of "authentic" review',
    bestForProducts: ["any"],
    bestForAudiences: ["researcher", "skeptic", "value-seeker"],
  },
  {
    id: "STR_03",
    category: "STR",
    name: "Weekly Recap",
    description: '"This week: gym 4x, slept 8hrs, ..." style',
    placementMethod: "Product as part of weekly wins list",
    bestForProducts: ["supplements", "wellness", "fitness"],
    bestForAudiences: ["wellness", "goal-setter", "fitness"],
  },
  {
    id: "STR_04",
    category: "STR",
    name: '"Things I Wish..."',
    description: '"Things I wish I knew at 25" listicle',
    placementMethod: "Product category mentioned naturally",
    bestForProducts: ["any"],
    bestForAudiences: ["young adult", "self-improvement", "reflective"],
  },
  {
    id: "STR_05",
    category: "STR",
    name: "Day In My Life",
    description: "Timeline-style content",
    placementMethod: "Product appears at one time slot",
    bestForProducts: ["supplements", "drinks", "food items"],
    bestForAudiences: ["lifestyle", "routine-focused", "aspirational"],
  },
  {
    id: "STR_06",
    category: "STR",
    name: "Starter Pack Meme",
    description: '"The ___ starter pack" grid layout',
    placementMethod: "Product as one item in the grid",
    bestForProducts: ["any"],
    bestForAudiences: ["gen-z", "meme-savvy", "humor"],
  },
  {
    id: "STR_07",
    category: "STR",
    name: "Hot Take / Opinion",
    description: "Bold statement with context text",
    placementMethod: "Product mentioned as evidence/example",
    bestForProducts: ["any"],
    bestForAudiences: ["opinionated", "thought leader", "debater"],
  },
  {
    id: "STR_08",
    category: "STR",
    name: '"POV" Content',
    description: "POV caption with scene photo",
    placementMethod: "Product visible in the POV scene",
    bestForProducts: ["any physical product"],
    bestForAudiences: ["gen-z", "tiktok user", "visual"],
  },
  {
    id: "STR_09",
    category: "STR",
    name: "Comparison Grid",
    description: '"What I ordered vs what I got"',
    placementMethod: "Product as the positive surprise",
    bestForProducts: ["any"],
    bestForAudiences: ["shopper", "humor", "relatable"],
  },
  {
    id: "STR_10",
    category: "STR",
    name: "Infographic Style",
    description: "Data / stats presented as social infographic",
    placementMethod: "Product data embedded in useful info",
    bestForProducts: ["supplements", "health", "fitness"],
    bestForAudiences: ["data-driven", "health-conscious", "educated"],
  },
];

export function getScenesByCategory(
  category: SceneTemplate["category"],
  scenes?: SceneTemplate[],
): SceneTemplate[] {
  const source = scenes ?? STEALTH_SCENES;
  return source.filter((s) => s.category === category);
}

export function getSceneById(id: string, scenes?: SceneTemplate[]): SceneTemplate | undefined {
  const source = scenes ?? STEALTH_SCENES;
  return source.find((s) => s.id === id);
}

// ─── Merge built-in + custom scenes ──────────────────────────────────────────

interface StealthSceneDbRow {
  id: string;
  scene_id: string;
  category: string;
  name: string;
  description: string;
  placement_method: string;
  best_for_products: string[];
  best_for_audiences: string[];
}

/**
 * Merges built-in scenes with custom DB scenes into a single SceneTemplate array.
 * Custom scenes are appended after built-in scenes and flagged with `isCustom: true`.
 */
export function mergeScenes(
  builtIn: SceneTemplate[],
  custom: StealthSceneDbRow[],
): SceneTemplate[] {
  const customTemplates: SceneTemplate[] = custom.map((row) => ({
    id: row.scene_id,
    category: row.category as SceneTemplate["category"],
    name: row.name,
    description: row.description,
    placementMethod: row.placement_method,
    bestForProducts: row.best_for_products,
    bestForAudiences: row.best_for_audiences,
    isCustom: true,
  }));
  return [...builtIn, ...customTemplates];
}

// ─── Audience-Scene Affinity Scoring ──────────────────────────────────────────

/**
 * Scenes that work poorly for middle-aged audiences (35+).
 * These are heavily Gen-Z / young-adult coded formats.
 */
const YOUNG_AUDIENCE_SCENES = new Set([
  "FMT_09", // Photo Dump — Instagram Gen-Z aesthetic
  "STR_06", // Starter Pack Meme — meme culture, young
  "STR_08", // "POV" Content — TikTok format
  "FMT_04", // Tweet/X Post — less relevant for 35+ in many markets
  "HUM_13", // Friend Group Gym — young social vibe
]);

/**
 * Scenes with highest affinity for middle-aged audiences.
 * These match the life stage, platforms, and content consumption patterns of 35-55.
 */
const MIDDLE_AGED_TOP_SCENES = new Set([
  "STR_04", // "Things I Wish..." — FOMO + nostalgia, universal 35+
  "FMT_03", // Reddit Post — trusted peer advice format
  "FMT_01", // iMessage Thread — word-of-mouth simulation
  "STR_05", // Day In My Life — lifestyle benchmarking
  "STR_03", // Weekly Recap — progress tracking, discipline
  "FMT_02", // Notes App — goal lists, routines
  "FMT_05", // Handwritten Note — journaling, personal
  "ENV_01", // Morning Counter — everyday routine
  "ENV_03", // Gym Bag Flat Lay — fitness lifestyle
  "ENV_04", // Office Desk — professional life
  "STR_01", // Before/After Routine — transformation story
  "STR_02", // Honest Review — authentic assessment
  "HUM_02", // Progress Check Mirror — body progress, self-improvement
  "HUM_03", // Kitchen Meal Prep — health-conscious lifestyle
  "HUM_05", // Car After Gym — commuter, relatable post-gym
  "HUM_07", // Morning Supplement Routine — daily discipline, domestic
  "HUM_09", // Getting Ready Mirror — morning routine, mature
  "HUM_10", // Living Room Workout — home fitness, parent-friendly
  "HUM_11", // Gym Action Shot — serious training, discipline
  "HUM_14", // Shirtless Morning Routine — domestic, mature
]);

/**
 * Scores scenes by audience fit and returns ranked groups.
 * Used by the planner to inject priority hints into the Gemini prompt.
 *
 * @param audienceKeywords - keywords from audience profile (e.g. ["fitness", "middle-aged"])
 * @param ageRange - optional age range string (e.g. "35-55")
 */
export function getRecommendedSceneIds(
  audienceKeywords: string[],
  ageRange?: string,
  scenes?: SceneTemplate[],
): { topPick: string[]; acceptable: string[]; avoid: string[] } {
  const allScenes = scenes ?? STEALTH_SCENES;
  const isMiddleAged = detectMiddleAged(audienceKeywords, ageRange);

  if (!isMiddleAged) {
    // No special filtering — all scenes equally weighted
    return {
      topPick: [],
      acceptable: allScenes.map((s) => s.id),
      avoid: [],
    };
  }

  const topPick: string[] = [];
  const acceptable: string[] = [];
  const avoid: string[] = [];

  for (const scene of allScenes) {
    if (YOUNG_AUDIENCE_SCENES.has(scene.id)) {
      avoid.push(scene.id);
    } else if (MIDDLE_AGED_TOP_SCENES.has(scene.id)) {
      topPick.push(scene.id);
    } else {
      // Built-in scenes not in either set + all custom scenes go to acceptable
      acceptable.push(scene.id);
    }
  }

  return { topPick, acceptable, avoid };
}

function detectMiddleAged(keywords: string[], ageRange?: string): boolean {
  if (ageRange) {
    // Parse both ends of the range (e.g. "25-35") and check max age
    const matches = ageRange.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (matches) {
      const maxAge = parseInt(matches[2], 10);
      if (maxAge >= 35) return true;
    } else {
      // Single number like "30+"
      const single = ageRange.match(/(\d+)/);
      if (single && parseInt(single[1], 10) >= 30) return true;
    }
  }
  const middleAgedSignals = [
    "middle-aged", "trung niên", "30+", "35+", "40+", "45+", "50+",
    "mature", "adult", "professional", "parent", "office worker",
  ];
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return middleAgedSignals.some((signal) =>
    lowerKeywords.some((k) => k.includes(signal)),
  );
}
