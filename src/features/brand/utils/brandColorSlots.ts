export type ColorTier = "primary" | "secondary" | "accent";
export type ColorKey = `${ColorTier}1` | `${ColorTier}2`;
export type BrandColors = Record<ColorKey, string | null>;

export const COLOR_TIERS: readonly ColorTier[] = ["primary", "secondary", "accent"];

export const EMPTY_BRAND_COLORS: BrandColors = {
  primary1: null,
  primary2: null,
  secondary1: null,
  secondary2: null,
  accent1: null,
  accent2: null,
};

export function getConfiguredTierColors(
  colors: BrandColors,
  keys: readonly [ColorKey, ColorKey],
): { key: ColorKey; value: string }[] {
  return keys
    .map((key) => ({ key, value: colors[key] }))
    .filter((entry): entry is { key: ColorKey; value: string } => entry.value !== null);
}

export function hasAnyConfiguredColor(colors: BrandColors): boolean {
  return Object.values(colors).some((value) => value !== null);
}
