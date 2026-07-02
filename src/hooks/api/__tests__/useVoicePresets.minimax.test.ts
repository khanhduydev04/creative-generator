import { describe, it, expect, vi, beforeEach } from "vitest";

const apiFetchMock = vi.fn().mockResolvedValue({ audioUrl: "data:audio/mpeg;base64,AAAA" });
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => apiFetchMock(...args) }));

import { buildMiniMaxPreviewBody } from "../useVoicePresets";

beforeEach(() => apiFetchMock.mockClear());

describe("buildMiniMaxPreviewBody", () => {
  it("maps camelCase input to the route's snake/nested body", () => {
    const body = buildMiniMaxPreviewBody({
      voiceId: "Wise_Woman",
      text: "Xin chào",
      model: "speech-2.6-hd",
      speed: 1.1,
      vol: 2,
      pitch: 3,
      emotion: "happy",
      languageBoost: "Vietnamese",
    });
    expect(body).toEqual({
      voice_id: "Wise_Woman",
      text: "Xin chào",
      model: "speech-2.6-hd",
      speed: 1.1,
      vol: 2,
      pitch: 3,
      emotion: "happy",
      languageBoost: "Vietnamese",
      voiceModify: undefined,
      pronunciationDict: undefined,
    });
  });
});
