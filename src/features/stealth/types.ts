// Stealth Ads Generator — shared type definitions

type SceneCategory = "ENV" | "FMT" | "STR" | "HUM";

export interface SceneTemplate {
  id: string;
  category: SceneCategory;
  name: string;
  description: string;
  placementMethod: string;
  bestForProducts: string[];
  bestForAudiences: string[];
  /** True for user-created custom scenes (from DB) */
  isCustom?: boolean;
}

export interface StealthScenePlan {
  sceneId: string;
  sceneName: string;
  /** "physical" = product packaging visible in image, "name-only" = product name in text only, no physical product */
  productVisibility: "physical" | "name-only";
  composition: {
    cameraAngle: string;
    lighting: string;
    colorMood: string;
    settingDetail: string;
  };
  surfaceContent: {
    whatViewerSees: string;
    stopScrollHook: string;
    emotionalTrigger: string;
  };
  productPlacement: {
    locationInFrame: string;
    sizeRelative: string;
    integrationMethod: string;
    labelVisibility: string;
    naturalJustification: string;
  };
  textInImage: {
    textType: string;
    textContent: string;
    textPlacement: string;
    textStyle: string;
  };
  localization: {
    market: string;
    culturalCues: string[];
    languageStyle: string;
  };
  generation: {
    aspectRatio: string;
    resolution: string;
    styleKeywords: string[];
    antiKeywords: string[];
  };
}

export interface StealthPlanCard {
  index: number;
  plan: StealthScenePlan;
  status: "planned" | "generating" | "completed" | "failed";
  resultImageUrl?: string;
  prompt?: string;
}

export interface StealthPlanRequest {
  brandId?: string;
  productId: string;
  productName: string;
  productDescription?: string | null;
  productImages: string[];
  landingPageUrl: string;
  targetAudience: {
    title: string;
    pain: string;
    angle: string;
    emotion: string;
  };
  sceneSelection: "auto" | string[];
  market?: string;
  marketId?: string;
  language?: string;
  quantity: number;
  aspectRatio: string;
  /** Product sensitivity level — "high" for body image, weight, beauty, personal insecurity */
  sensitivityLevel?: "normal" | "high";
  /** Target audience age range — e.g. "35-55" */
  audienceAgeRange?: string;
}

export interface StealthGenerateRequest {
  plans: StealthScenePlan[];
  productName: string;
  productDescription?: string | null;
  productImages: string[];
  aspectRatio: string;
  resolution?: string;
  /** Passed to assembler for demographic-aware prompt tuning */
  sensitivityLevel?: "normal" | "high";
  audienceAgeRange?: string;
  /** Optional competitor/reference image URL — appended to imageInput for KIE */
  referenceImageUrl?: string;
  /** Optional summary of reference analysis — appended to assembled prompt */
  referenceAnalysisSummary?: string;
  /** Pre-cached resized product image URLs from /api/prepare-generation (pack mode optimization) */
  cachedResizedProductImageUrls?: string[];
}

export interface StealthGenerationResult {
  imageUrl: string;
  taskId: string;
  prompt: string;
  sceneName: string;
  sceneId: string;
}

/** A single image that failed to generate (e.g. content-filtered by KIE). */
export interface StealthImageError {
  /** Stable client-side key for React lists and retry tracking. */
  id: string;
  sceneName: string;
  sceneId: string;
  error: string;
  /** Retry payload — present when the failure is re-runnable. */
  prompt?: string;
  imageInput?: string[];
  aspectRatio?: string;
  resolution?: string;
}
