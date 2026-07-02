import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockListVideos } = vi.hoisted(() => ({
  mockListVideos: vi.fn(),
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
    listVideos = mockListVideos;
  },
}));

vi.mock("@/services/storageService", () => ({
  StorageService: class {},
}));

import { GET } from "../video/competitors/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockListVideos.mockResolvedValue({ videos: [], total: 0 });
});

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("GET /api/video/competitors — sort & source validation", () => {
  it("rejects an invalid sort value", async () => {
    const res = await GET(makeRequest("http://localhost/api/video/competitors?brandId=brand-1&sort=bogus"));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid source value", async () => {
    const res = await GET(makeRequest("http://localhost/api/video/competitors?brandId=brand-1&source=bogus"));
    expect(res.status).toBe(400);
  });

  it("forwards a valid sort and source to listVideos", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/video/competitors?brandId=brand-1&sort=views&source=manual"),
    );
    expect(res.status).toBe(200);
    expect(mockListVideos).toHaveBeenCalledWith("brand-1", undefined, 1, 20, undefined, "views", "manual");
  });

  it("omits sort/source and lets the service apply its defaults", async () => {
    const res = await GET(makeRequest("http://localhost/api/video/competitors?brandId=brand-1"));
    expect(res.status).toBe(200);
    expect(mockListVideos).toHaveBeenCalledWith("brand-1", undefined, 1, 20, undefined, undefined, undefined);
  });
});
