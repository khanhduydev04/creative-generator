import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockListBrands, mockCreateBrand } = vi.hoisted(() => ({
  mockListBrands: vi.fn(),
  mockCreateBrand: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "test-user-id" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({})),
}));

vi.mock("../../../services/brandService", () => {
  return {
    BrandService: class {
      listBrands = mockListBrands;
      createBrand = mockCreateBrand;
    },
  };
});

vi.mock("@/lib/auth/verify-admin", () => ({
  verifyAdmin: vi.fn(),
  isVerifyError: (r: unknown) => r instanceof Response,
}));

import { GET, POST } from "../brands/route";
import { verifyAdmin } from "@/lib/auth/verify-admin";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyAdmin).mockResolvedValue({ userId: "test-user-id", role: "ceo" } as never);
});

describe("GET /api/brands", () => {
  function makeRequest(params: Record<string, string> = {}): NextRequest {
    const url = new URL("http://localhost/api/brands");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return new NextRequest(url);
  }

  it("returns brands for authenticated user", async () => {
    mockListBrands.mockResolvedValue([{ id: "b1", name: "Brand A" }]);
    const response = await GET(makeRequest());
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.brands).toHaveLength(1);
  });

  it("returns empty brands array when no brands found", async () => {
    mockListBrands.mockResolvedValue([]);
    const response = await GET(makeRequest());
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.brands).toHaveLength(0);
  });

  it("returns 500 on service error", async () => {
    mockListBrands.mockRejectedValue(new Error("Query failed"));
    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
  });
});

describe("POST /api/brands", () => {
  function makeRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/brands", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("creates brand with valid data", async () => {
    mockCreateBrand.mockResolvedValue({ id: "b2", name: "New Brand" });
    const response = await POST(makeRequest({ name: "New Brand", description: "A brand" }));
    expect(response.status).toBe(201);
    expect(mockCreateBrand).toHaveBeenCalledWith("New Brand", "A brand");
  });

  it("creates brand without description", async () => {
    mockCreateBrand.mockResolvedValue({ id: "b2", name: "X" });
    const response = await POST(makeRequest({ name: "X" }));
    expect(response.status).toBe(201);
    expect(mockCreateBrand).toHaveBeenCalledWith("X", undefined);
  });

  it("returns 400 when name is empty string", async () => {
    const response = await POST(makeRequest({ name: "  " }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const response = await POST(makeRequest({ clientId: "c1" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for non-object body", async () => {
    const response = await POST(makeRequest("string"));
    expect(response.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    mockCreateBrand.mockRejectedValue(new Error("Unique violation"));
    const response = await POST(makeRequest({ clientId: "c1", name: "Brand" }));
    expect(response.status).toBe(500);
  });
});
