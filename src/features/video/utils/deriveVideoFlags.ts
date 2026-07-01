import type { WhisperStatus } from "@/features/video/types";

export interface TranscriptJoinRow {
  whisper_status: WhisperStatus | null;
  brand_scripts: { generated_audios: { id: string }[] | null }[] | null;
}

export interface VideoFlags {
  hasGeneratedAudio: boolean;
  transcriptionFailed: boolean;
}

export function deriveVideoFlags(
  transcripts: TranscriptJoinRow[] | TranscriptJoinRow | null,
): VideoFlags {
  const transcript = Array.isArray(transcripts) ? transcripts[0] : transcripts;
  if (!transcript) {
    return { hasGeneratedAudio: false, transcriptionFailed: false };
  }

  const hasGeneratedAudio = (transcript.brand_scripts ?? []).some(
    (script) => (script.generated_audios?.length ?? 0) > 0,
  );

  return {
    hasGeneratedAudio,
    transcriptionFailed: transcript.whisper_status === "failed",
  };
}
