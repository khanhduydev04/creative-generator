import { describe, it, expect, vi } from "vitest";

// The real "server-only" package unconditionally throws unless resolved via
// Next's "react-server" webpack export condition, which Vitest doesn't apply.
// route.ts transitively imports it via "@/lib/key-provider" — stub it out so
// the module graph can load (mirrors audio-elevenlabs-settings.test.ts).
vi.mock("server-only", () => ({}));

vi.mock("@/lib/user-context", async (orig) => {
  const actual = await orig<typeof import("@/lib/user-context")>();
  return { ...actual, requireUser: async () => ({ userId: "u1" }) };
});
vi.mock("@/lib/key-provider", () => ({
  getMiniMaxCredentials: () => ({ apiKey: "k", groupId: "g" }),
}));
vi.mock("@/services/minimaxService", () => ({
  MiniMaxService: class {
    listVoices = async () => [
      { voice_id: "Wise_Woman", name: "Wise Woman", category: "system" },
      // Account-level clone belonging to a DIFFERENT brand. Since all brands
      // share one MINIMAX_GROUP_ID, listVoices() returns every clone in the
      // account regardless of which brand created it — the route must filter
      // this out and rely on the RLS-scoped DB table instead.
      { voice_id: "otherbrandvoice99", name: "Other Brand Voice", category: "cloned" },
    ];
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/services/minimaxClonedVoiceService", () => ({
  MiniMaxClonedVoiceService: class {
    listByBrand = async () => [
      { voice_id: "brandvoice01", display_name: "Brand Voice" },
    ];
  },
}));

import { GET } from "../minimax/voices/route";

function makeReq(url: string) {
  return { url } as unknown as Parameters<typeof GET>[0];
}

describe("GET /api/video/minimax/voices", () => {
  it("returns system voices plus the brand's cloned voices, excluding other brands' account-level clones", async () => {
    const res = await GET(makeReq("http://x/api/video/minimax/voices?brandId=b1"));
    const json = await res.json();
    expect(json.voices).toEqual([
      { voice_id: "Wise_Woman", name: "Wise Woman", category: "system" },
      { voice_id: "brandvoice01", name: "Brand Voice", category: "cloned" },
    ]);
    const voiceIds = (json.voices as Array<{ voice_id: string }>).map((v) => v.voice_id);
    expect(voiceIds).not.toContain("otherbrandvoice99");
  });

  it("400s when brandId is missing", async () => {
    const res = await GET(makeReq("http://x/api/video/minimax/voices"));
    expect(res.status).toBe(400);
  });
});
