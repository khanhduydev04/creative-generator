import { describe, it, expect } from "vitest";
import { deriveVideoFlags } from "@/features/video/utils/deriveVideoFlags";

describe("deriveVideoFlags", () => {
  it("returns all false when transcripts is null", () => {
    expect(deriveVideoFlags(null)).toEqual({
      hasGeneratedAudio: false,
      transcriptionFailed: false,
    });
  });

  it("returns all false when transcripts is an empty array", () => {
    expect(deriveVideoFlags([])).toEqual({
      hasGeneratedAudio: false,
      transcriptionFailed: false,
    });
  });

  it("flags transcriptionFailed when whisper_status is failed", () => {
    const result = deriveVideoFlags({ whisper_status: "failed", brand_scripts: [] });
    expect(result).toEqual({ hasGeneratedAudio: false, transcriptionFailed: true });
  });

  it("flags hasGeneratedAudio when any script has a generated audio", () => {
    const result = deriveVideoFlags({
      whisper_status: "done",
      brand_scripts: [
        { generated_audios: [] },
        { generated_audios: [{ id: "audio-1" }] },
      ],
    });
    expect(result).toEqual({ hasGeneratedAudio: true, transcriptionFailed: false });
  });

  it("handles transcripts passed as a single-element array (Supabase embed shape)", () => {
    const result = deriveVideoFlags([
      { whisper_status: "done", brand_scripts: [{ generated_audios: [{ id: "a1" }] }] },
    ]);
    expect(result).toEqual({ hasGeneratedAudio: true, transcriptionFailed: false });
  });

  it("treats null generated_audios as no audio", () => {
    const result = deriveVideoFlags({
      whisper_status: "done",
      brand_scripts: [{ generated_audios: null }],
    });
    expect(result.hasGeneratedAudio).toBe(false);
  });

  it("treats null brand_scripts as no audio", () => {
    const result = deriveVideoFlags({ whisper_status: "processing", brand_scripts: null });
    expect(result).toEqual({ hasGeneratedAudio: false, transcriptionFailed: false });
  });
});
