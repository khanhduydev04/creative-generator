// Client Component: editable transcript with status badge, save, and re-transcribe actions
"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { useRunTranscription, usePatchTranscript } from "@/hooks/api/useTranscripts";
import type { Transcript } from "@/features/video/types";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  processing: "bg-blue-500/15 text-blue-400",
  done: "bg-green-500/15 text-green-400",
  failed: "bg-red-500/15 text-red-400",
};

const SAVE_FEEDBACK_DURATION_MS = 2_000;

interface TranscriptEditorProps {
  transcript: Transcript | null;
  onCreateTranscript: () => Promise<void>;
  isCreating: boolean;
}

export function TranscriptEditor({
  transcript,
  onCreateTranscript,
  isCreating,
}: TranscriptEditorProps) {
  const { t } = useT();
  const runTranscription = useRunTranscription();
  const patchTranscript = usePatchTranscript();

  const displayText = transcript?.edited_text ?? transcript?.raw_text ?? "";
  const [editedText, setEditedText] = useState(displayText);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEditedText(transcript?.edited_text ?? transcript?.raw_text ?? "");
    setSaved(false);
  }, [transcript?.edited_text, transcript?.raw_text]);

  const statusLabel: Record<string, string> = {
    pending: t.video.transcriptPending,
    processing: t.video.transcriptProcessing,
    done: t.video.transcriptDone,
    failed: t.video.transcriptFailed,
  };

  async function handleRun() {
    if (!transcript) {
      await onCreateTranscript();
      return;
    }
    await runTranscription.mutateAsync(transcript.id);
  }

  async function handleSave() {
    if (!transcript) return;
    await patchTranscript.mutateAsync({ transcriptId: transcript.id, editedText });
    setSaved(true);
    setTimeout(() => setSaved(false), SAVE_FEEDBACK_DURATION_MS);
  }

  const isRunning = isCreating || runTranscription.isPending;
  const isProcessing = transcript?.whisper_status === "processing";
  const isSaving = patchTranscript.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {transcript && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[transcript.whisper_status]}`}>
              {statusLabel[transcript.whisper_status]}
            </span>
          )}
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
        </div>
        <div className="flex gap-2">
          {transcript?.whisper_status === "done" && (
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={isRunning}
              className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-xs text-foreground-muted hover:bg-black/[0.04] disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t.video.retranscribe}
            </button>
          )}
          {(!transcript || transcript.whisper_status === "failed") && (
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={isRunning || isProcessing}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t.video.startTranscription}
            </button>
          )}
        </div>
      </div>

      <textarea
        value={editedText}
        onChange={(e) => { setEditedText(e.target.value); setSaved(false); }}
        disabled={!transcript || transcript.whisper_status !== "done"}
        placeholder={t.video.transcriptPlaceholder}
        className="h-36 w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
      />

      {transcript?.whisper_status === "done" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || editedText === displayText}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? t.video.savedTranscript : t.video.saveTranscript}
          </button>
        </div>
      )}
    </div>
  );
}
