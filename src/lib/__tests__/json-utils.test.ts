import { describe, it, expect } from "vitest";
import { safeJsonParse } from "../json-utils";

describe("safeJsonParse", () => {
  // ── Clean JSON ─────────────────────────────────────────────────────────────

  it("parses valid JSON object", () => {
    expect(safeJsonParse('{"a": 1, "b": "hello"}')).toEqual({
      a: 1,
      b: "hello",
    });
  });

  it("parses valid JSON array", () => {
    expect(safeJsonParse("[1, 2, 3]")).toEqual([1, 2, 3]);
  });

  // ── Markdown code fences ──────────────────────────────────────────────────

  it("strips ```json fences", () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(safeJsonParse(input)).toEqual({ key: "value" });
  });

  it("strips ``` fences (no language tag)", () => {
    const input = '```\n{"key": "value"}\n```';
    expect(safeJsonParse(input)).toEqual({ key: "value" });
  });

  it("strips ```JSON fences (case-insensitive)", () => {
    const input = '```JSON\n{"key": "value"}\n```';
    expect(safeJsonParse(input)).toEqual({ key: "value" });
  });

  // ── Text before/after JSON ────────────────────────────────────────────────

  it("extracts JSON from surrounding text", () => {
    const input = 'Here is the result:\n{"name": "test"}\nEnd of response.';
    expect(safeJsonParse(input)).toEqual({ name: "test" });
  });

  it("extracts JSON array from surrounding text", () => {
    const input = 'Response:\n[{"id": 1}]\nDone';
    expect(safeJsonParse(input)).toEqual([{ id: 1 }]);
  });

  // ── Trailing commas ───────────────────────────────────────────────────────

  it("fixes trailing comma before }", () => {
    const input = '{"a": 1, "b": 2,}';
    expect(safeJsonParse(input)).toEqual({ a: 1, b: 2 });
  });

  it("fixes trailing comma before ]", () => {
    const input = "[1, 2, 3,]";
    expect(safeJsonParse(input)).toEqual([1, 2, 3]);
  });

  it("fixes multiple trailing commas", () => {
    const input = '{"items": [1, 2,], "name": "x",}';
    expect(safeJsonParse(input)).toEqual({ items: [1, 2], name: "x" });
  });

  // ── BOM handling ──────────────────────────────────────────────────────────

  it("strips UTF-8 BOM character", () => {
    const bom = String.fromCharCode(0xfeff);
    const input = bom + '{"key": "value"}';
    expect(safeJsonParse(input)).toEqual({ key: "value" });
  });

  // ── Truncated JSON repair ─────────────────────────────────────────────────

  it("repairs truncated JSON with unclosed object", () => {
    const input = '{"name": "test", "items": [1, 2';
    const result = safeJsonParse<{ name: string; items: number[] }>(input);
    expect(result.name).toBe("test");
    expect(result.items).toEqual([1, 2]);
  });

  it("repairs truncated JSON with unclosed string", () => {
    const input = '{"name": "hello wor';
    const result = safeJsonParse<{ name: string }>(input);
    expect(result.name).toBe("hello wor");
  });

  it("repairs truncated nested JSON", () => {
    const input = '{"outer": {"inner": "val"';
    const result = safeJsonParse<{ outer: { inner: string } }>(input);
    expect(result.outer.inner).toBe("val");
  });

  // ── Error cases ───────────────────────────────────────────────────────────

  it("throws on completely invalid input", () => {
    expect(() => safeJsonParse("not json at all")).toThrow(
      /Invalid JSON from Gemini/,
    );
  });

  it("throws on empty string", () => {
    expect(() => safeJsonParse("")).toThrow();
  });

  // ── Nested structures ─────────────────────────────────────────────────────

  it("handles deeply nested objects", () => {
    const input = '{"a": {"b": {"c": {"d": 42}}}}';
    expect(safeJsonParse(input)).toEqual({ a: { b: { c: { d: 42 } } } });
  });

  it("handles mixed arrays and objects", () => {
    const input = '{"items": [{"id": 1}, {"id": 2}], "total": 2}';
    expect(safeJsonParse(input)).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      total: 2,
    });
  });
});
