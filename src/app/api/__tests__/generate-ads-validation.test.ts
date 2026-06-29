import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../generate-ads/route";

// Mock authentication
vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "test-user-id" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

// Mock all heavy dependencies to test just validation logic
vi.mock("@/lib/gemini-reader", () => ({
  readProductPage: vi.fn(),
  analyzeCompetitorAdImage: vi.fn(),
  analyzeCompetitorAdImageClaude: vi.fn(),
}));

vi.mock("@/lib/concept-skills", () => ({
  analyzeCompetitorSheet: vi.fn(),
  applyConceptSkillVariants: vi.fn(),
}));

vi.mock("@/lib/prompt-assembler", () => ({
  assemblePrompt: vi.fn(() => "mock prompt"),
  assembleCompetitorRefPrompt: vi.fn(() => "mock prompt"),
}));

vi.mock("@/lib/concept-prompt-loader", () => ({
  loadFullConcept: vi.fn(),
}));

vi.mock("@/lib/sheets-reader", () => ({
  fetchCompetitorSheet: vi.fn(),
}));

vi.mock("@/lib/competitor-analyzer", () => ({
  analyzeCompetitorAds: vi.fn(),
}));

vi.mock("@/services/kieClient", () => ({
  generateImage: vi.fn(),
}));

vi.mock("@/lib/image-utils", () => ({
  resizeAndUploadImages: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/services/brandProductService", () => ({
  BrandProductService: vi.fn().mockImplementation(() => ({
    getProduct: vi.fn().mockResolvedValue(null),
  })),
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/generate-ads", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validConceptBody = {
  productId: "p1",
  productName: "Test Product",
  productImages: ["https://example.com/img.jpg"],
  landingPageUrl: "https://example.com/product",
  market: "US",
  conceptIds: ["data_hook"],
  targetAudience: { title: "Test", pain: null, angle: null, emotion: null },
  brandProfile: {
    brandName: "Test Brand",
    logoUrl: null,
    primaryColor1: "#000",
    primaryColor2: "#111",
    secondaryColor1: "#222",
    secondaryColor2: "#333",
    accentColor1: "#444",
    accentColor2: "#555",
    typography: "Inter",
  },
  outputConfig: { aspectRatio: "1:1", count: 1 },
};

describe("POST /api/generate-ads — input validation", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/generate-ads", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 when landingPageUrl is missing and no cached context", async () => {
    const response = await POST(
      makeRequest({ ...validConceptBody, landingPageUrl: "" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });

  it("returns 400 when targetAudience is missing", async () => {
    const response = await POST(
      makeRequest({ ...validConceptBody, targetAudience: null }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("allows concept mode without market (skips competitor analysis)", async () => {
    // Market is now optional — route skips competitor data when not provided
    const response = await POST(
      makeRequest({ ...validConceptBody, market: "" }),
    );
    // Should proceed to SSE stream, not return 400
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("returns 400 for concept mode without conceptIds", async () => {
    const response = await POST(
      makeRequest({ ...validConceptBody, conceptIds: [] }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("at least one concept");
  });

  it("returns 400 for competitor_ref mode without reference image", async () => {
    const response = await POST(
      makeRequest({
        ...validConceptBody,
        generationMode: "competitor_ref",
        competitorRefImageUrl: undefined,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("reference image");
  });

  it("clamps count to max 10", async () => {
    // This won't return 400, it'll proceed to SSE stream — we just verify the route accepts it
    const response = await POST(
      makeRequest({
        ...validConceptBody,
        outputConfig: { aspectRatio: "1:1", count: 100 },
      }),
    );

    // Should return SSE stream (200), not a validation error
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });
});
