// Content Adaptation feature — shared type definitions

import type { AdaptedContent, ProductDataForAdapt } from "@/lib/content-adapter";

/** A single item to be adapted: an ad image paired with sample content */
export interface ContentAdaptItem {
  /** Index in the original results array */
  index: number;
  /** URL of the generated ad image */
  adImageUrl: string;
  /** Unique identifier — taskId (standard) or sceneId (stealth) */
  identifier: string;
  /** Human-readable label — headline (standard) or sceneName (stealth) */
  label: string;
  /** Sample content to adapt (from Excel or manual input) */
  sampleContent: string;
  /** Where the sample content came from */
  source: "excel" | "manual";
}

/** Tracks the adaptation status for a single item */
export interface AdaptationResult {
  identifier: string;
  label: string;
  adImageUrl: string;
  sampleContent: string;
  adaptedContent: AdaptedContent | null;
  status: "pending" | "adapting" | "completed" | "failed";
  error?: string;
}

/** Props passed to ContentAdaptPanel from parent progress components */
export interface ContentAdaptPanelProps {
  /** Generated ad results mapped to a generic shape */
  items: Array<{ imageUrl: string; identifier: string; label: string }>;
  /** "text-only" for standard flows, "vision" for stealth flows */
  mode: "text-only" | "vision";
  /** Product data for content grounding */
  productData: ProductDataForAdapt | null;
  /** Target language */
  language: string;
  /** Close the panel */
  onClose: () => void;
}
