import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// The real "server-only" package unconditionally throws unless resolved via
// Next's "react-server" webpack export condition, which Vitest doesn't apply.
// route.ts transitively imports it via "@/lib/key-provider" — stub it out so
// the module graph can load (mirrors audio-elevenlabs-settings.test.ts).
vi.mock("server-only", () => ({}));

const { mockSynthesize, mockUpload, mockCreateAudio, mockGetMiniMaxCredentials } = vi.hoisted(() => ({
  mockSynthesize: vi.fn(),
  mockUpload: vi.fn(),
  mockCreateAudio: vi.fn(),
  mockGetMiniMaxCredentials: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "user-1" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

vi.mock("@/lib/key-provider", () => ({
  getMiniMaxCredentials: mockGetMiniMaxCredentials,
  getUserApiKey: vi.fn(),
}));

vi.mock("@/services/minimaxService", () => ({
  MiniMaxService: class {
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
import { POST } from "../audio/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMiniMaxCredentials.mockReturnValue({ apiKey: "k", groupId: "g" });
  mockUpload.mockResolvedValue("audio/brand-1/script-1/123.mp3");
  mockCreateAudio.mockResolvedValue({ id: "a1" });
});

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/video/audio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scriptId: "s1", voicePresetId: "vp1" }),
  });
}

describe("POST /api/video/audio — minimax", () => {
  it("synthesizes via MiniMax and stores a minimax audio row", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabase({
        provider: "minimax",
        provider_voice_id: "Wise_Woman",
        speed: 1.1,
        provider_config: {
          kind: "minimax",
          model: "speech-2.6-hd",
          audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
        },
      }),
    );
    mockSynthesize.mockResolvedValue({
      audio: new Uint8Array([1, 2, 3]).buffer,
      durationSecs: 2.5,
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(201);
    expect(mockSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Xin chào",
        voiceId: "Wise_Woman",
        model: "speech-2.6-hd",
        speed: 1.1,
      }),
    );
    expect(mockCreateAudio).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "minimax", durationSecs: 2.5 }),
    );
  });

  it("returns 400 when provider_voice_id is missing", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabase({
        provider: "minimax",
        provider_voice_id: null,
        speed: 1.0,
        provider_config: null,
      }),
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    expect(mockSynthesize).not.toHaveBeenCalled();
  });
});
