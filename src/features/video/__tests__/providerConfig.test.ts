import { describe, it, expect } from "vitest";
import { defaultMiniMaxConfig, parseMiniMaxConfig } from "../providerConfig";

describe("defaultMiniMaxConfig", () => {
  it("returns a valid minimax config with sensible defaults", () => {
    const cfg = defaultMiniMaxConfig();
    expect(cfg.kind).toBe("minimax");
    expect(cfg.model).toBe("speech-2.6-hd");
    expect(cfg.audio).toEqual({ format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 });
    expect(cfg.languageBoost).toBe("Vietnamese");
  });
});

describe("parseMiniMaxConfig", () => {
  it("parses a full valid config", () => {
    const raw = {
      kind: "minimax",
      model: "speech-02-hd",
      emotion: "happy",
      vol: 2,
      pitch: 3,
      languageBoost: "English",
      audio: { format: "mp3", sampleRate: 44100, bitrate: 256000, channel: 2 },
      voiceModify: { timbre: 10, soundEffects: "robotic" },
      pronunciationDict: ["Ladospice/La đô spai"],
    };
    const cfg = parseMiniMaxConfig(raw);
    expect(cfg).not.toBeNull();
    expect(cfg?.model).toBe("speech-02-hd");
    expect(cfg?.voiceModify?.soundEffects).toBe("robotic");
    expect(cfg?.pronunciationDict).toEqual(["Ladospice/La đô spai"]);
  });

  it("returns null for non-object input", () => {
    expect(parseMiniMaxConfig(null)).toBeNull();
    expect(parseMiniMaxConfig("nope")).toBeNull();
    expect(parseMiniMaxConfig(42)).toBeNull();
  });

  it("returns null when model is not a known MiniMax model", () => {
    expect(parseMiniMaxConfig({ kind: "minimax", model: "gpt-4", audio: {} })).toBeNull();
  });

  it("fills default audio when audio fields are missing", () => {
    const cfg = parseMiniMaxConfig({ kind: "minimax", model: "speech-2.6-turbo" });
    expect(cfg?.audio).toEqual({ format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 });
  });

  it("drops an invalid emotion but keeps the config", () => {
    const cfg = parseMiniMaxConfig({ kind: "minimax", model: "speech-2.6-hd", emotion: "grumpy" });
    expect(cfg).not.toBeNull();
    expect(cfg?.emotion).toBeUndefined();
  });
});
