import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// The real "server-only" package unconditionally throws unless resolved via
// Next's "react-server" webpack export condition, which Vitest doesn't apply.
// route.ts transitively imports it via "@/lib/key-provider" (Vbee branch,
// untouched by this test) — stub it out so the module graph can load.
vi.mock("server-only", () => ({}));

const { mockSynthesize, mockUpload, mockCreateAudio } = vi.hoisted(() => ({
  mockSynthesize: vi.fn(),
  mockUpload: vi.fn(),
  mockCreateAudio: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "user-1" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

vi.mock("@/services/elevenlabsService", () => ({
  ElevenLabsService: class {
    synthesize = mockSynthesize;
  },
}));

vi.mock("@/services/storageService", () => ({
  StorageService: class {
    upload = mockUpload;
  },
}));

vi.mock("@/services/generatedAudioService", () => ({
  GeneratedAudioService: class {
    create = mockCreateAudio;
  },
}));

function makeSupabase(presetRow: Record<string, unknown>) {
  return {
    from: (table: string) => {
      if (table === "brand_scripts") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { final_text: "Xin chào", raw_text: null, brand_id: "brand-1" },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "voice_presets") {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: presetRow, error: null }) }) }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { POST } from "../video/audio/route";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ELEVENLABS_API_KEY = "test-key";
  mockSynthesize.mockResolvedValue(new ArrayBuffer(8));
  mockUpload.mockResolvedValue("audio/brand-1/script-1/123.mp3");
  mockCreateAudio.mockResolvedValue({ id: "audio-1" });
});

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/video/audio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scriptId: "script-1", voicePresetId: "preset-1" }),
  });
}

describe("POST /api/video/audio — ElevenLabs stability/speed", () => {
  it("passes both stability and speed for eleven_flash_v2_5", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabase({
        id: "preset-1",
        provider: "elevenlabs",
        provider_voice_id: "voice-1",
        elevenlabs_model: "eleven_flash_v2_5",
        stability: 0.3,
        speed: 0.9,
      }),
    );

    await POST(makeRequest());

    expect(mockSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({ stability: 0.3, speed: 0.9 }),
    );
  });

  it("omits speed but still passes stability for eleven_v3", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabase({
        id: "preset-1",
        provider: "elevenlabs",
        provider_voice_id: "voice-1",
        elevenlabs_model: "eleven_v3",
        stability: 1.0,
        speed: 1.0,
      }),
    );

    await POST(makeRequest());

    const callArg = mockSynthesize.mock.calls[0][0];
    expect(callArg.stability).toBe(1.0);
    expect(callArg.speed).toBeUndefined();
  });
});
