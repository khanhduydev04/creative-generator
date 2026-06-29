import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetBrandKit, mockGetLogoUrls, mockSaveBrandKit } = vi.hoisted(() => ({
  mockGetBrandKit: vi.fn(),
  mockGetLogoUrls: vi.fn(),
  mockSaveBrandKit: vi.fn(),
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
      getBrandKit = mockGetBrandKit;
      getLogoUrls = mockGetLogoUrls;
      saveBrandKit = mockSaveBrandKit;
    },
  };
});

import { GET, PUT } from "../brand-kit/[brandId]/route";

beforeEach(() => {
  vi.clearAllMocks();
});

const mockParams = Promise.resolve({ brandId: "brand-123" });

describe("GET /api/brand-kit/[brandId]", () => {
  it("returns brand kit and logo URLs", async () => {
    const mockKit = { id: "kit-1", typography: "Inter" };
    mockGetBrandKit.mockResolvedValue(mockKit);
    mockGetLogoUrls.mockReturnValue({ primary: "https://example.com/logo.png" });

    const req = new NextRequest("http://localhost/api/brand-kit/brand-123");
    const response = await GET(req, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.kit).toEqual(mockKit);
  });

  it("returns null when brand kit doesn't exist", async () => {
    mockGetBrandKit.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/brand-kit/brand-123");
    const response = await GET(req, { params: mockParams });
    const data = await response.json();
    expect(data.kit).toBeNull();
    expect(data.logoUrls).toBeNull();
  });

  it("returns 500 on service error", async () => {
    mockGetBrandKit.mockRejectedValue(new Error("DB error"));
    const req = new NextRequest("http://localhost/api/brand-kit/brand-123");
    const response = await GET(req, { params: mockParams });
    expect(response.status).toBe(500);
  });
});

describe("PUT /api/brand-kit/[brandId]", () => {
  function makeRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/brand-kit/brand-123", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("saves brand kit with valid data", async () => {
    const savedKit = { id: "kit-1", typography: "Roboto" };
    mockSaveBrandKit.mockResolvedValue(savedKit);
    mockGetLogoUrls.mockReturnValue(null);

    const response = await PUT(
      makeRequest({ typography: "Roboto", font_source: "google", primary_color_1: "#FF0000" }),
      { params: mockParams },
    );
    expect(response.status).toBe(200);
    expect(mockSaveBrandKit).toHaveBeenCalledWith(
      "brand-123",
      expect.objectContaining({ typography: "Roboto", font_source: "google" }),
    );
  });

  it("ignores invalid font_source values", async () => {
    mockSaveBrandKit.mockResolvedValue({});
    mockGetLogoUrls.mockReturnValue(null);

    await PUT(makeRequest({ font_source: "invalid" }), { params: mockParams });
    expect(mockSaveBrandKit).toHaveBeenCalledWith(
      "brand-123",
      expect.objectContaining({ font_source: undefined }),
    );
  });

  it("returns 400 for non-object body", async () => {
    const response = await PUT(makeRequest("string body"), { params: mockParams });
    expect(response.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    mockSaveBrandKit.mockRejectedValue(new Error("Save failed"));
    const response = await PUT(makeRequest({ typography: "Inter" }), { params: mockParams });
    expect(response.status).toBe(500);
  });
});
