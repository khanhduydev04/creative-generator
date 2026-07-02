import { describe, it, expect, vi } from "vitest";

// The real "server-only" package unconditionally throws unless resolved via
// Next's "react-server" webpack export condition, which Vitest doesn't apply.
// route.ts transitively imports it via "@/lib/key-provider" — stub it out so
// the module graph can load even though key-provider is mocked below.
vi.mock("server-only", () => ({}));

const synthesizeMock = vi.fn().mockResolvedValue({
  audio: new Uint8Array([10, 20, 30]).buffer,
  durationSecs: 1,
});

vi.mock("@/lib/user-context", async (orig) => {
  const actual = await orig<typeof import("@/lib/user-context")>();
  return { ...actual, requireUser: async () => ({ userId: "u1" }) };
});
vi.mock("@/lib/key-provider", () => ({
  getMiniMaxCredentials: () => ({ apiKey: "k", groupId: "g" }),
}));
vi.mock("@/services/minimaxService", () => ({
  MiniMaxService: class {
    synthesize = synthesizeMock;
  },
}));

import { POST } from "../minimax/preview/route";

function makeReq(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/video/minimax/preview", () => {
  it("returns a base64 data URI", async () => {
    const res = await POST(
      makeReq({ voice_id: "Wise_Woman", text: "Xin chào", model: "speech-2.6-hd" }),
    );
    const json = await res.json();
    expect(json.audioUrl).toBe(`data:audio/mpeg;base64,${Buffer.from([10, 20, 30]).toString("base64")}`);
  });

  it("400s when voice_id or text is missing", async () => {
    const res = await POST(makeReq({ text: "" }));
    expect(res.status).toBe(400);
  });
});
