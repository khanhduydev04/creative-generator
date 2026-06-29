import type { vi } from "./vi";

export type Locale = "vi" | "en";
export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALES: readonly Locale[] = ["vi", "en"] as const;

type StringLeaves<T> = {
  [K in keyof T]: T[K] extends string ? string : StringLeaves<T[K]>;
};

export type Dictionary = StringLeaves<typeof vi>;
