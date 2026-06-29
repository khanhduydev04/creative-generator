export type StageState = "idle" | "running" | "done";
export type StageKey = "transcribe" | "script" | "voice" | "done";

export interface PipelineStageInput {
  whisperStatus: "pending" | "processing" | "done" | "failed" | null;
  hasSavedScript: boolean;
  hasAudio: boolean;
}

export interface PipelineStage {
  key: StageKey;
  state: StageState;
}

export function derivePipelineStages(input: PipelineStageInput): PipelineStage[] {
  const transcribe: StageState =
    input.whisperStatus === "done"
      ? "done"
      : input.whisperStatus === "processing"
        ? "running"
        : "idle";

  // "idle" covers both "transcript not done" and "transcript done, awaiting script" —
  // the UI uses opacity gating (Task 10) to distinguish locked vs unlocked visually.
  const script: StageState = input.hasSavedScript ? "done" : "idle";

  const voice: StageState = input.hasAudio ? "done" : "idle";
  const done: StageState = input.hasAudio ? "done" : "idle";

  return [
    { key: "transcribe", state: transcribe },
    { key: "script", state: script },
    { key: "voice", state: voice },
    { key: "done", state: done },
  ];
}
