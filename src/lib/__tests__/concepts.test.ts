import { describe, it, expect } from "vitest";
import { toConceptFromRow, toConceptWithPromptFromRow } from "../concepts";

// Mock a DB row shape matching Database["public"]["Tables"]["concept_prompts"]["Row"]
function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "uuid-123",
    concept_id: "data_hook",
    label: "Data Hook",
    description: "A data-driven hook concept",
    requires_competitor: true,
    reference_images: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
    prompt: "Use statistics and numbers to grab attention",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("toConceptFromRow", () => {
  it("converts DB row to client-safe Concept (no prompt)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = toConceptFromRow(makeRow() as any);
    expect(result).toEqual({
      id: "data_hook",
      label: "Data Hook",
      description: "A data-driven hook concept",
      requiresCompetitor: true,
      referenceImages: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
    });
    // Should NOT include prompt
    expect(result).not.toHaveProperty("prompt");
  });

  it("handles empty reference_images", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = toConceptFromRow(makeRow({ reference_images: [] }) as any);
    expect(result.referenceImages).toEqual([]);
  });

  it("handles requires_competitor = false", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = toConceptFromRow(makeRow({ requires_competitor: false }) as any);
    expect(result.requiresCompetitor).toBe(false);
  });
});

describe("toConceptWithPromptFromRow", () => {
  it("converts DB row to full ConceptWithPrompt (includes prompt)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = toConceptWithPromptFromRow(makeRow() as any);
    expect(result).toEqual({
      id: "data_hook",
      label: "Data Hook",
      description: "A data-driven hook concept",
      requiresCompetitor: true,
      referenceImages: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
      prompt: "Use statistics and numbers to grab attention",
    });
  });

  it("preserves empty prompt string", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = toConceptWithPromptFromRow(makeRow({ prompt: "" }) as any);
    expect(result.prompt).toBe("");
  });
});
