// Client Component: clickable stage progress bar with derived states
"use client";

import { Check, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import {
  derivePipelineStages,
  type StageKey,
} from "@/features/video/utils/pipelineStages";

interface PipelineStageBarProps {
  whisperStatus: "pending" | "processing" | "done" | "failed" | null;
  hasSavedScript: boolean;
  hasAudio: boolean;
  onStageClick: (key: StageKey) => void;
}

export function PipelineStageBar({
  whisperStatus,
  hasSavedScript,
  hasAudio,
  onStageClick,
}: PipelineStageBarProps) {
  const { t } = useT();
  const stages = derivePipelineStages({ whisperStatus, hasSavedScript, hasAudio });

  const labels: Record<StageKey, string> = {
    transcribe: t.video.stageTranscribe,
    script: t.video.stageScript,
    voice: t.video.stageVoice,
    done: t.video.stageDone,
  };

  return (
    <div className="sticky top-0 z-10 mb-6 flex items-center gap-2 rounded-2xl border border-border/20 bg-background-elevated/80 px-4 py-3 backdrop-blur">
      {stages.map((stage, index) => (
        <div key={stage.key} className="flex flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => onStageClick(stage.key)}
            className="flex items-center gap-2 text-left"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                stage.state === "done"
                  ? "bg-green-500/15 text-green-600"
                  : stage.state === "running"
                    ? "bg-blue-500/15 text-blue-500"
                    : "bg-black/[0.04] text-foreground-subtle"
              }`}
            >
              {stage.state === "done" ? (
                <Check className="h-4 w-4" />
              ) : stage.state === "running" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={`text-sm font-medium ${
                stage.state === "idle" ? "text-foreground-subtle" : "text-foreground"
              }`}
            >
              {labels[stage.key]}
            </span>
          </button>
          {index < stages.length - 1 && (
            <span className="h-px flex-1 bg-border/30" />
          )}
        </div>
      ))}
    </div>
  );
}
