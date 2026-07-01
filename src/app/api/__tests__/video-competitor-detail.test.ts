import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetVideoById } = vi.hoisted(() => ({
  mockGetVideoById: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "test-user-id" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/services/competitorVideoService", () => ({
  CompetitorVideoService: class {
    getVideoById = mockGetVideoById;
  },
}));

import { GET } from "../video/competitors/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("GET /api/video/competitors/[id]", () => {
  it("rejects a missing brandId", async () => {
    const res = await GET(makeRequest("http://localhost/api/video/competitors/v1"), {
      params: Promise.resolve({ id: "v1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns the video when found", async () => {
    mockGetVideoById.mockResolvedValue({ id: "v1", brand_id: "brand-1", status: "winner" });
    const res = await GET(
      makeRequest("http://localhost/api/video/competitors/v1?brandId=brand-1"),
      { params: Promise.resolve({ id: "v1" }) },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.video.id).toBe("v1");
    expect(mockGetVideoById).toHaveBeenCalledWith("v1", "brand-1");
  });

  it("returns 404 when the video does not exist or isn't visible to this brand", async () => {
    mockGetVideoById.mockResolvedValue(null);
    const res = await GET(
      makeRequest("http://localhost/api/video/competitors/missing?brandId=brand-1"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });
});
