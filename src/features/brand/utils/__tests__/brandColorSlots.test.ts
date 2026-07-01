import { describe, it, expect } from "vitest";
import {
  EMPTY_BRAND_COLORS,
  getConfiguredTierColors,
  hasAnyConfiguredColor,
} from "../brandColorSlots";

describe("getConfiguredTierColors", () => {
  it("returns both keys when both colors in the tier are set", () => {
    const colors = { ...EMPTY_BRAND_COLORS, primary1: "#111111", primary2: "#222222" };
    expect(getConfiguredTierColors(colors, ["primary1", "primary2"])).toEqual([
      { key: "primary1", value: "#111111" },
      { key: "primary2", value: "#222222" },
    ]);
  });

  it("returns only the configured key when one color in the tier is null", () => {
    const colors = { ...EMPTY_BRAND_COLORS, accent1: "#facc15" };
    expect(getConfiguredTierColors(colors, ["accent1", "accent2"])).toEqual([
      { key: "accent1", value: "#facc15" },
    ]);
  });

  it("returns an empty array when neither color in the tier is set", () => {
    expect(getConfiguredTierColors(EMPTY_BRAND_COLORS, ["secondary1", "secondary2"])).toEqual([]);
  });
});

describe("hasAnyConfiguredColor", () => {
  it("returns false when no colors are configured", () => {
    expect(hasAnyConfiguredColor(EMPTY_BRAND_COLORS)).toBe(false);
  });

  it("returns true when at least one color is configured", () => {
    expect(hasAnyConfiguredColor({ ...EMPTY_BRAND_COLORS, accent2: "#f59e0b" })).toBe(true);
  });
});
