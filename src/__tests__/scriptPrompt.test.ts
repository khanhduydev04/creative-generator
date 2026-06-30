import { it, expect } from "vitest";
import { buildScriptSystemPrompt } from "@/services/scriptPrompt";
import type { ScriptPromptInput } from "@/services/scriptPrompt";

const base: ScriptPromptInput = {
  brandName: "Thích Cay",
  brandDescription: "Gia vị cay chất lượng cao",
  productName: "Sa Tế Sò Điệp 250g",
  productDescription: "Sốt sa tế sò điệp vùng biển sạch",
  price: "49k",
  attributes: "Ít dầu, tự nhiên, không bột ngọt",
  targetAudience: "Người trẻ 18-30 thích ăn cay",
  sellingPoints: "Vị đậm, ít béo, dễ dùng",
  tone: "humor",
  notes: null,
  ttsProvider: "vbee",
  elevenLabsModel: null,
};

it("includes product name and price in the prompt", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("Sa Tế Sò Điệp 250g");
  expect(prompt).toContain("Giá/Sale: 49k");
});

it("instructs NOT to write section labels in the output", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("KHÔNG ghi nhãn phân đoạn");
});

it("requires weaving the brand name into the script at least once", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("BẮT BUỘC lồng tên thương hiệu");
  expect(prompt).toContain("Thích Cay");
});

it("instructs to mirror transcript length (no word cap)", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("Giữ NGUYÊN số câu");
  expect(prompt).not.toContain("Max ");
  expect(prompt).not.toContain("300");
});

it("vbee prompt contains comma/period instruction and NOT expression tags", () => {
  const prompt = buildScriptSystemPrompt({ ...base, ttsProvider: "vbee" });
  expect(prompt).toContain("dấu phẩy");
  expect(prompt).not.toContain("[chuckles]");
});

it("elevenlabs v3 prompt contains expression tags", () => {
  const prompt = buildScriptSystemPrompt({
    ...base,
    ttsProvider: "elevenlabs",
    elevenLabsModel: "eleven_v3",
  });
  expect(prompt).toContain("[chuckles]");
  expect(prompt).toContain("[amused]");
  expect(prompt).not.toContain("dấu phẩy");
});

it("elevenlabs v2.5 prompt does NOT contain expression tags", () => {
  const prompt = buildScriptSystemPrompt({
    ...base,
    ttsProvider: "elevenlabs",
    elevenLabsModel: "eleven_flash_v2_5",
  });
  expect(prompt).not.toContain("[chuckles]");
  expect(prompt).toContain("CHỮ HOA");
});

it("skips product section when productName is not provided", () => {
  const prompt = buildScriptSystemPrompt({
    ...base,
    productName: null,
    productDescription: null,
    price: null,
  });
  expect(prompt).not.toContain("Sản phẩm:");
  expect(prompt).not.toContain("Giá/Sale:");
});

it("analysis step is silent (KHÔNG viết ra)", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("KHÔNG viết ra");
});

it("output forbids blank lines entirely", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("KHÔNG để dòng trắng");
});
