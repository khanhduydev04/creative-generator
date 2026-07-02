import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: "user-1" }),
  handleApiError: vi.fn((e: unknown) =>
    NextResponse.json({ error: (e as Error).message }, { status: 500 }),
  ),
}));

vi.mock("@/services/elevenlabsService", () => ({
  ElevenLabsService: class {
    synthesize = vi.fn().mockResolvedValue(new TextEncoder().encode("fake-mp3-bytes").buffer);
  },
}));

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

import { POST } from "../video/elevenlabs/preview/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/video/elevenlabs/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/video/elevenlabs/preview", () => {
  it("rejects a missing voice_id or text", async () => {
    process.env = { ...ORIGINAL_ENV, ELEVENLABS_API_KEY: "test-key" };
    const res = await POST(makeRequest({ voice_id: "", text: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects text longer than 500 characters", async () => {
    process.env = { ...ORIGINAL_ENV, ELEVENLABS_API_KEY: "test-key" };
    const res = await POST(makeRequest({ voice_id: "v1", text: "a".repeat(501) }));
    expect(res.status).toBe(400);
  });

  it("returns a base64 data URL on success", async () => {
    process.env = { ...ORIGINAL_ENV, ELEVENLABS_API_KEY: "test-key" };
    const res = await POST(makeRequest({ voice_id: "v1", text: "Xin chào", model_id: "eleven_flash_v2_5", stability: 0.3, speed: 0.9 }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { audioUrl: string };
    expect(body.audioUrl.startsWith("data:audio/mpeg;base64,")).toBe(true);
  });

  it("returns 500 when ELEVENLABS_API_KEY is missing", async () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env["ELEVENLABS_API_KEY"];
    const res = await POST(makeRequest({ voice_id: "v1", text: "Xin chào" }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("elevenlabs_key_missing");
  });
});
