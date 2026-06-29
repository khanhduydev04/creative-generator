// Client Component: HTML5 audio player with play/pause, download, delete controls
"use client";

import { useRef, useState } from "react";
import { Play, Pause, Download, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import type { GeneratedAudio } from "@/features/video/types";

interface AudioPlayerProps {
  audio: GeneratedAudio;
  publicUrl: string;
  onDelete?: () => void;
  isDeleting?: boolean;
}

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

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-background-elevated/30 px-4 py-3">
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
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {duration && (
          <p className="text-xs text-foreground-subtle">{duration}</p>
        )}
      </div>

      <a
        href={publicUrl}
        download
        className="rounded-lg p-1.5 text-foreground-muted hover:bg-white/[0.04] hover:text-foreground"
        aria-label={t.video.downloadAudio}
      >
        <Download className="h-4 w-4" />
      </a>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          aria-label={t.video.deleteAudio}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
