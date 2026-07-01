import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockResetBrandKit, mockGetLogoUrls } = vi.hoisted(() => ({
  mockResetBrandKit: vi.fn(),
  mockGetLogoUrls: vi.fn(),
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

vi.mock("@/services/brandKitService", () => {
  return {
    BrandKitService: class {
      resetBrandKit = mockResetBrandKit;
      getLogoUrls = mockGetLogoUrls;
    },
  };
});

import { POST } from "../brand-kit/[brandId]/reset/route";

beforeEach(() => {
  vi.clearAllMocks();
});

const mockParams = Promise.resolve({ brandId: "brand-123" });

describe("POST /api/brand-kit/[brandId]/reset", () => {
  it("resets the brand kit and returns it", async () => {
    const resetKit = {
      id: "kit-1",
      typography: "Inter",
      font_source: "google",
      primary_color_1: null,
      primary_color_2: null,
      secondary_color_1: null,
      secondary_color_2: null,
      accent_color_1: null,
      accent_color_2: null,
      logo_light_path: null,
      logo_dark_path: null,
    };
    mockResetBrandKit.mockResolvedValue(resetKit);
    mockGetLogoUrls.mockReturnValue({ lightUrl: null, darkUrl: null });

    const req = new NextRequest("http://localhost/api/brand-kit/brand-123/reset", { method: "POST" });
    const response = await POST(req, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.kit).toEqual(resetKit);
    expect(data.logoUrls).toEqual({ lightUrl: null, darkUrl: null });
    expect(mockResetBrandKit).toHaveBeenCalledWith("brand-123");
  });

  it("returns 500 on service error", async () => {
    mockResetBrandKit.mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/brand-kit/brand-123/reset", { method: "POST" });
    const response = await POST(req, { params: mockParams });
    expect(response.status).toBe(500);
  });
});
