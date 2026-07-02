import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ElevenLabsService } from "@/services/elevenlabsService";

const originalFetch = global.fetch;

function mockFetchOnce(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function parseRequestBody(fetchMock: ReturnType<typeof vi.fn>): {
  voice_settings: Record<string, unknown>;
} {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  // Safe: body is always a JSON string produced by synthesize()'s JSON.stringify call
  return JSON.parse(init.body as string) as { voice_settings: Record<string, unknown> };
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe("ElevenLabsService.synthesize", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = mockFetchOnce();
  });

  it("sends speed when provided", async () => {
    const service = new ElevenLabsService("test-key");

    await service.synthesize({
      text: "Xin chào",
      voice_id: "voice-1",
      speed: 0.9,
    });

    const body = parseRequestBody(fetchMock);
    expect(body.voice_settings.speed).toBe(0.9);
  });

  it("omits speed entirely when undefined", async () => {
    const service = new ElevenLabsService("test-key");

    await service.synthesize({
      text: "Xin chào",
      voice_id: "voice-1",
      model_id: "eleven_v3",
      speed: undefined,
    });

    const body = parseRequestBody(fetchMock);
    expect(body.voice_settings).not.toHaveProperty("speed");
  });

  it("defaults stability, similarity_boost, and style when omitted", async () => {
    const service = new ElevenLabsService("test-key");

    await service.synthesize({
      text: "Xin chào",
      voice_id: "voice-1",
    });

    const body = parseRequestBody(fetchMock);
    expect(body.voice_settings.stability).toBe(0.5);
    expect(body.voice_settings.similarity_boost).toBe(0.75);
    expect(body.voice_settings.style).toBe(0.0);
  });
});
