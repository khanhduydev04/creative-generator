import { describe, it, expect, vi, afterEach } from "vitest";
import { MiniMaxService } from "../minimaxService";

function hexOf(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

afterEach(() => vi.restoreAllMocks());

describe("MiniMaxService.synthesize", () => {
  it("posts a correct body and decodes hex audio", async () => {
    const audioHex = hexOf([1, 2, 3, 255]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { audio: audioHex, status: 2 },
        extra_info: { audio_length: 2500 },
        base_resp: { status_code: 0, status_msg: "success" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("key-123", "group-9");
    const result = await svc.synthesize({
      text: "Xin chào",
      voiceId: "Vietnamese_Male_1",
      model: "speech-2.6-hd",
      speed: 1.2,
      vol: 2,
      pitch: 3,
      emotion: "happy",
      languageBoost: "Vietnamese",
      audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
    });

    expect(new Uint8Array(result.audio)).toEqual(new Uint8Array([1, 2, 3, 255]));
    expect(result.durationSecs).toBe(2.5);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/v1/t2a_v2?GroupId=group-9");
    expect(init.headers.Authorization).toBe("Bearer key-123");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("speech-2.6-hd");
    expect(body.output_format).toBe("hex");
    expect(body.voice_setting).toMatchObject({
      voice_id: "Vietnamese_Male_1",
      speed: 1.2,
      vol: 2,
      pitch: 3,
      emotion: "happy",
    });
    expect(body.audio_setting).toEqual({
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    });
  });

  it("includes voice_modify and pronunciation_dict only when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { audio: "00", status: 2 },
        extra_info: { audio_length: 1000 },
        base_resp: { status_code: 0 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    await svc.synthesize({
      text: "t",
      voiceId: "v",
      model: "speech-2.6-hd",
      audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
      voiceModify: { timbre: 10, soundEffects: "robotic" },
      pronunciationDict: ["Ladospice/La đô spai"],
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.voice_modify).toEqual({ timbre: 10, sound_effects: "robotic" });
    expect(body.pronunciation_dict).toEqual({ tone: ["Ladospice/La đô spai"] });
  });

  it("throws ProviderError invalid_key when base_resp.status_code is 1004", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base_resp: { status_code: 1004, status_msg: "auth failed" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    await expect(
      svc.synthesize({
        text: "t",
        voiceId: "v",
        model: "speech-2.6-hd",
        audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
      }),
    ).rejects.toMatchObject({ name: "ProviderError", kind: "invalid_key", httpStatus: 401 });
  });

  it("throws ProviderError invalid_key on HTTP 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    await expect(
      svc.synthesize({
        text: "t",
        voiceId: "v",
        model: "speech-2.6-hd",
        audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
      }),
    ).rejects.toMatchObject({ name: "ProviderError", kind: "invalid_key" });
  });
});
