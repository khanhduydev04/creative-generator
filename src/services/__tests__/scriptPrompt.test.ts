import { describe, it, expect } from "vitest";
import { buildScriptSystemPrompt, MAX_SCRIPT_WORDS } from "@/services/scriptPrompt";

describe("buildScriptSystemPrompt", () => {
  const base = {
    brandName: "Ladospice",
    brandDescription: "Đồ ăn cay",
    tone: "humor",
  };

  it("includes brand name, mapped tone label and word cap", () => {
    const p = buildScriptSystemPrompt(base);
    expect(p).toContain("Ladospice");
    expect(p).toContain("Hài hước");
    expect(p).toContain(String(MAX_SCRIPT_WORDS));
  });

  it("includes product + marketing lines only when provided", () => {
    const p = buildScriptSystemPrompt({
      ...base,
      productName: "Mì cay",
      productDescription: "Cay xé",
      attributes: "độ cay cấp 7",
      targetAudience: "GenZ",
      sellingPoints: "freeship",
    });
    expect(p).toContain("Mì cay");
    expect(p).toContain("độ cay cấp 7");
    expect(p).toContain("GenZ");
    expect(p).toContain("freeship");
  });

  it("omits marketing lines when fields are empty/null", () => {
    const p = buildScriptSystemPrompt({ ...base, attributes: "", targetAudience: null });
    expect(p).not.toContain("Đặc tính");
    expect(p).not.toContain("Đối tượng");
  });

  it("falls back to raw tone when not in TONE_MAP", () => {
    const p = buildScriptSystemPrompt({ ...base, tone: "weird" });
    expect(p).toContain("weird");
  });
});
