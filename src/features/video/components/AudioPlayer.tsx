// Client Component: HTML5 audio player with play/pause, download, delete controls
"use client";

import { useRef, useState } from "react";
import { Play, Pause, Download, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { formatRelativeTime } from "@/features/video/utils/formatRelativeTime";
import type { GeneratedAudio } from "@/features/video/types";
import type { TtsProvider } from "@/services/scriptPrompt";

interface AudioPlayerProps {
  audio: GeneratedAudio;
  publicUrl: string;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const PROVIDER_BADGE: Record<TtsProvider, string> = {
  vbee: "bg-purple-500/15 text-purple-600",
  elevenlabs: "bg-blue-500/15 text-blue-600",
  minimax: "bg-emerald-500/15 text-emerald-600",
};

const PROVIDER_LABEL: Record<TtsProvider, string> = {
  vbee: "Vbee",
  elevenlabs: "ElevenLabs",
  minimax: "MiniMax",
};

export function AudioPlayer({ audio, publicUrl, onDelete, isDeleting }: AudioPlayerProps) {
  const { t } = useT();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
    setPlaying(!playing);
  }

  const label = audio.voice_preset?.display_name ?? audio.voice_preset?.voice_code ?? "—";
  const duration = audio.duration_secs
    ? `${Math.floor(audio.duration_secs / 60)}:${String(Math.floor(audio.duration_secs % 60)).padStart(2, "0")}`
    : null;
  const scriptPreview = audio.brand_script?.final_text ?? audio.brand_script?.raw_text ?? null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-background-elevated/30 px-4 py-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={publicUrl}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />

      <button
        type="button"
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PROVIDER_BADGE[audio.provider]}`}>
            {PROVIDER_LABEL[audio.provider]}
          </span>
          <span className="ml-auto shrink-0 text-xs text-foreground-subtle">
            {formatRelativeTime(audio.created_at)}
          </span>
        </div>
        {scriptPreview && (
          <p className="truncate text-xs text-foreground-subtle">{scriptPreview}</p>
        )}
        {duration && (
          <p className="text-xs text-foreground-subtle">{duration}</p>
        )}
      </div>

      <a
        href={publicUrl}
        download
        className="shrink-0 rounded-lg p-1.5 text-foreground-muted hover:bg-black/[0.04] hover:text-foreground"
        aria-label={t.video.downloadAudio}
      >
        <Download className="h-4 w-4" />
      </a>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="shrink-0 rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          aria-label={t.video.deleteAudio}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
