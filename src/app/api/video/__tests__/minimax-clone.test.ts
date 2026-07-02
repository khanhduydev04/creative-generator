import { describe, it, expect, vi } from "vitest";

// The real "server-only" package unconditionally throws unless resolved via
// Next's "react-server" webpack export condition, which Vitest doesn't apply.
// route.ts transitively imports it via "@/lib/key-provider" — stub it out so
// the module graph can load (mirrors audio-elevenlabs-settings.test.ts).
vi.mock("server-only", () => ({}));

const uploadFileMock = vi.fn().mockResolvedValue(555);
const cloneVoiceMock = vi.fn().mockResolvedValue({ demoAudioUrl: "https://x/demo.mp3" });
const storageUploadMock = vi.fn().mockResolvedValue("clone-src/b1/x.mp3");
const createRowMock = vi.fn().mockResolvedValue({ id: "cv1", voice_id: "brandvoice01" });

vi.mock("@/lib/user-context", async (orig) => {
  const actual = await orig<typeof import("@/lib/user-context")>();
  return { ...actual, requireUser: async () => ({ userId: "u1" }) };
});
vi.mock("@/lib/key-provider", () => ({
  getMiniMaxCredentials: () => ({ apiKey: "k", groupId: "g" }),
}));
vi.mock("@/services/minimaxService", () => ({
  MiniMaxService: class {
    uploadFile = uploadFileMock;
    cloneVoice = cloneVoiceMock;
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/services/storageService", () => ({
  StorageService: class {
    upload = storageUploadMock;
  },
}));
vi.mock("@/services/minimaxClonedVoiceService", () => ({
  MiniMaxClonedVoiceService: class {
    create = createRowMock;
  },
}));

import { POST } from "../minimax/clone/route";

function makeReq(form: FormData) {
  return { formData: async () => form } as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/video/minimax/clone", () => {
  it("uploads, clones, and stores a row", async () => {
    const form = new FormData();
    form.append("brandId", "b1");
    form.append("displayName", "Brand Voice");
    form.append("voiceId", "brandvoice01");
    form.append("model", "speech-2.6-hd");
    form.append("file", new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" }), "s.mp3");

    const res = await POST(makeReq(form));
    expect(res.status).toBe(201);
    expect(uploadFileMock).toHaveBeenCalled();
    expect(cloneVoiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 555, voiceId: "brandvoice01", model: "speech-2.6-hd" }),
    );
    expect(createRowMock).toHaveBeenCalledWith(
      expect.objectContaining({ brandId: "b1", voiceId: "brandvoice01" }),
    );
  });

  it("rejects an invalid voiceId", async () => {
    const form = new FormData();
    form.append("brandId", "b1");
    form.append("displayName", "d");
    form.append("voiceId", "bad"); // too short / fails regex
    form.append("file", new Blob([new Uint8Array([1])], { type: "audio/mpeg" }), "s.mp3");
    const res = await POST(makeReq(form));
    expect(res.status).toBe(400);
  });

  it("rejects a non-audio file", async () => {
    const form = new FormData();
    form.append("brandId", "b1");
    form.append("displayName", "d");
    form.append("voiceId", "brandvoice01");
    form.append("file", new Blob([new Uint8Array([1])], { type: "text/plain" }), "s.txt");
    const res = await POST(makeReq(form));
    expect(res.status).toBe(400);
  });
});
