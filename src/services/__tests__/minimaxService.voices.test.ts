import { describe, it, expect, vi, afterEach } from "vitest";
import { MiniMaxService } from "../minimaxService";

afterEach(() => vi.restoreAllMocks());

describe("MiniMaxService.listVoices", () => {
  it("merges system_voice and voice_cloning into a flat list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        system_voice: [
          { voice_id: "Wise_Woman", voice_name: "Wise Woman" },
          { voice_id: "Calm_Man", voice_name: "Calm Man" },
        ],
        voice_cloning: [{ voice_id: "brandvoice01", description: "Brand voice" }],
        base_resp: { status_code: 0 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    const voices = await svc.listVoices();
    expect(voices).toEqual([
      { voice_id: "Wise_Woman", name: "Wise Woman", category: "system" },
      { voice_id: "Calm_Man", name: "Calm Man", category: "system" },
      { voice_id: "brandvoice01", name: "Brand voice", category: "cloned" },
    ]);
    expect(fetchMock.mock.calls[0][0]).toContain("/v1/get_voice?GroupId=g");
  });
});

describe("MiniMaxService.uploadFile", () => {
  it("posts multipart and returns file_id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ file: { file_id: 987654 }, base_resp: { status_code: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    const fileId = await svc.uploadFile(new Uint8Array([1, 2, 3]).buffer, "sample.mp3");
    expect(fileId).toBe(987654);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/v1/files/upload?GroupId=g");
    expect(init.body).toBeInstanceOf(FormData);
    // Authorization present but NOT Content-Type (browser/undici sets multipart boundary)
    expect(init.headers.Authorization).toBe("Bearer k");
    expect(init.headers["Content-Type"]).toBeUndefined();
  });
});

describe("MiniMaxService.cloneVoice", () => {
  it("posts clone request and returns demo audio url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ demo_audio: "https://x/demo.mp3", base_resp: { status_code: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    const out = await svc.cloneVoice({
      fileId: 111,
      voiceId: "brandvoice01",
      model: "speech-2.6-hd",
      needNoiseReduction: true,
    });
    expect(out.demoAudioUrl).toBe("https://x/demo.mp3");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      file_id: 111,
      voice_id: "brandvoice01",
      model: "speech-2.6-hd",
      need_noise_reduction: true,
    });
  });

  it("throws ProviderError when clone base_resp indicates failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base_resp: { status_code: 2038, status_msg: "no permission" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    await expect(
      svc.cloneVoice({ fileId: 1, voiceId: "brandvoice01", model: "speech-2.6-hd" }),
    ).rejects.toMatchObject({ name: "ProviderError", kind: "quota_exceeded" });
  });
});
