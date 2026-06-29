import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { mockUpload, mockGetPublicUrl } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "test-user-id" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      storage: {
        from: () => ({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
        }),
      },
    }),
  ),
}));

vi.mock("@/services/savedAdService", () => ({
  SavedAdService: class {
    create = vi.fn().mockResolvedValue(undefined);
  },
}));

import { POST } from "../save-ad/route";

const originalFetch = global.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({
    data: { publicUrl: "https://storage.example.com/generated-ads/saved.jpg" },
  });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    headers: new Headers({ "content-type": "image/jpeg" }),
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/save-ad", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  imageUrl: "https://kie-api.example.com/image/abc123.jpg",
  prompt: "A test prompt",
  headline: "Test Headline",
  concept: "data_hook",
  market: "US",
  brandId: "brand-uuid",
  productName: "Test Product",
};

describe("POST /api/save-ad — happy path", () => {
  it("saves ad and returns permanent URL", async () => {
    const response = await POST(makeRequest(validBody));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.permanentUrl).toBe("https://storage.example.com/generated-ads/saved.jpg");
  });

  it("storage path includes userId", async () => {
    await POST(makeRequest(validBody));
    const uploadCall = mockUpload.mock.calls[0];
    // First arg is the path — should contain 'test-user-id'
    expect(uploadCall[0]).toContain("test-user-id");
    expect(uploadCall[0]).toContain("brand-uuid");
  });
});

describe("POST /api/save-ad — validation", () => {
  it("returns 400 when imageUrl is missing", async () => {
    const response = await POST(makeRequest({ ...validBody, imageUrl: "" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when brandId is missing", async () => {
    const response = await POST(makeRequest({ ...validBody, brandId: "" }));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/save-ad — SSRF protection", () => {
  const ssrfUrls = [
    "https://localhost/image.jpg",
    "https://127.0.0.1/image.jpg",
    "https://10.0.0.5/image.jpg",
    "https://192.168.1.1/image.jpg",
    "https://172.16.0.1/image.jpg",
    "https://metadata.google.internal/config",
    "https://myhost.local/image.jpg",
    "http://kie-api.example.com/image.jpg",
    "https://[::1]/image.jpg",
  ];

  for (const url of ssrfUrls) {
    it(`blocks ${url}`, async () => {
      const response = await POST(makeRequest({ ...validBody, imageUrl: url }));
      expect(response.status).toBe(400);
    });
  }

  it("blocks invalid URL format", async () => {
    const response = await POST(makeRequest({ ...validBody, imageUrl: "not-a-url" }));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/save-ad — error handling", () => {
  it("returns 502 when image download fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(502);
  });

  it("returns 500 when storage upload fails", async () => {
    mockUpload.mockResolvedValue({ error: { message: "Bucket full" } });
    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(500);
  });
});
