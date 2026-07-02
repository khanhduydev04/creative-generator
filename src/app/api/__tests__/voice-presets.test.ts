import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "user-1" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/services/voicePresetService", () => ({
  VoicePresetService: class {
    create = mockCreate;
  },
}));

import { POST } from "../video/voice-presets/route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/video/voice-presets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/video/voice-presets", () => {
  it("forwards the given stability value to the service", async () => {
    mockCreate.mockResolvedValue({ id: "preset-1", stability: 0.3 });
    const res = await POST(
      makeRequest({
        brandId: "brand-1",
        displayName: "Adam - Firm",
        provider: "elevenlabs",
        providerVoiceId: "voice-1",
        elevenLabsModel: "eleven_flash_v2_5",
        stability: 0.3,
      }),
    );
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stability: 0.3 }));
  });

  it("defaults stability to 0.5 when not provided", async () => {
    mockCreate.mockResolvedValue({ id: "preset-1", stability: 0.5 });
    await POST(
      makeRequest({
        brandId: "brand-1",
        displayName: "Adam - Firm",
        provider: "elevenlabs",
        providerVoiceId: "voice-1",
        elevenLabsModel: "eleven_flash_v2_5",
      }),
    );
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stability: 0.5 }));
  });
});
