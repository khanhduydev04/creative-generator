import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: "user-1" }),
  handleApiError: vi.fn((e: unknown) =>
    NextResponse.json({ error: (e as Error).message }, { status: 500 }),
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/services/elevenlabsService", () => ({
  ElevenLabsService: class {
    listVoices = vi.fn().mockResolvedValue([
      {
        voice_id: "v-abc",
        name: "Rachel",
        category: "premade",
        preview_url: "https://example.com/rachel.mp3",
        labels: { accent: "american" },
      },
    ]);
  },
}));

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

import { GET } from "../video/elevenlabs/voices/route";

describe("GET /api/video/elevenlabs/voices", () => {
  it("returns 200 with voices array when ELEVENLABS_API_KEY is set", async () => {
    process.env = { ...ORIGINAL_ENV, ELEVENLABS_API_KEY: "test-key" };
    const req = new NextRequest("http://localhost/api/video/elevenlabs/voices");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { voices: Array<{ voice_id: string; name: string }> };
    expect(body.voices).toHaveLength(1);
    expect(body.voices[0]).toMatchObject({ voice_id: "v-abc", name: "Rachel" });
  });

  it("returns 500 when ELEVENLABS_API_KEY is missing", async () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env["ELEVENLABS_API_KEY"];
    const req = new NextRequest("http://localhost/api/video/elevenlabs/voices");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("elevenlabs_key_missing");
  });
});
