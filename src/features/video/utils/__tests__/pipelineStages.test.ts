import { describe, it, expect } from "vitest";
import { derivePipelineStages } from "@/features/video/utils/pipelineStages";

describe("derivePipelineStages", () => {
  it("all idle when nothing started", () => {
    const s = derivePipelineStages({ whisperStatus: null, hasSavedScript: false, hasAudio: false });
    expect(s.map((x) => x.state)).toEqual(["idle", "idle", "idle", "idle"]);
  });

  it("transcribe running while processing", () => {
    const s = derivePipelineStages({ whisperStatus: "processing", hasSavedScript: false, hasAudio: false });
    expect(s[0].state).toBe("running");
  });

  it("script idle until transcript done", () => {
    const s = derivePipelineStages({ whisperStatus: "done", hasSavedScript: false, hasAudio: false });
    expect(s[0].state).toBe("done");
    expect(s[1].state).toBe("idle");
  });

  it("voice + done complete when audio exists", () => {
    const s = derivePipelineStages({ whisperStatus: "done", hasSavedScript: true, hasAudio: true });
    expect(s.map((x) => x.state)).toEqual(["done", "done", "done", "done"]);
  });

  it("transcribe failed maps to idle (not running)", () => {
    const s = derivePipelineStages({ whisperStatus: "failed", hasSavedScript: false, hasAudio: false });
    expect(s[0].state).toBe("idle");
  });

  it("script done is independent of audio", () => {
    const s = derivePipelineStages({ whisperStatus: "done", hasSavedScript: true, hasAudio: false });
    expect(s[1].state).toBe("done");
    expect(s[2].state).toBe("idle");
  });
});
