// Client Component: modal showing full script + audio player for a generated audio
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { AudioPlayer } from "@/features/video/components/AudioPlayer";
import type { GeneratedAudio } from "@/features/video/types";

const DISPLAY_LOCALE = "vi-VN";

interface AudioDetailModalProps {
  audio: GeneratedAudio;
  publicUrl: string;
  onClose: () => void;
}

function formatDuration(durationSecs: number | null): string {
  if (!durationSecs) return "—";
  const minutes = Math.floor(durationSecs / 60);
  const seconds = String(Math.floor(durationSecs % 60)).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function AudioDetailModal({ audio, publicUrl, onClose }: AudioDetailModalProps) {
  const { t } = useT();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const scriptText = audio.brand_script?.final_text ?? audio.brand_script?.raw_text ?? null;
  const voiceLabel = audio.voice_preset?.display_name ?? audio.voice_preset?.voice_code ?? "—";
  const speed = audio.voice_preset?.speed ?? null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border-strong/30 bg-background-elevated shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/20 px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">{t.video.audioDetailTitle}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.video.audioDetailClose}
            className="rounded-lg p-1.5 text-foreground-muted hover:bg-black/[0.05] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Player */}
          <AudioPlayer audio={audio} publicUrl={publicUrl} />

          {/* Metadata */}
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                Sản phẩm
              </dt>
              <dd className="mt-0.5 text-foreground">{audio.brand_script?.brand_product?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                {t.video.audioDetailVoice}
              </dt>
              <dd className="mt-0.5 text-foreground">{voiceLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                {t.video.audioDetailProvider}
              </dt>
              <dd className="mt-0.5 text-foreground">{audio.provider}</dd>
            </div>
            {speed !== null && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                  {t.video.audioDetailSpeed}
                </dt>
                <dd className="mt-0.5 text-foreground">{speed}x</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                {t.video.audioDetailDuration}
              </dt>
              <dd className="mt-0.5 text-foreground">{formatDuration(audio.duration_secs)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                {t.video.audioDetailCreated}
              </dt>
              <dd className="mt-0.5 text-foreground">
                {new Date(audio.created_at).toLocaleString(DISPLAY_LOCALE)}
              </dd>
            </div>
          </dl>

          {/* Script */}
          <div className="mt-5">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground-subtle">
              {t.video.audioDetailScript}
            </h4>
            {scriptText ? (
              <p className="whitespace-pre-wrap rounded-xl border border-border/30 bg-background-subtle p-4 text-sm leading-relaxed text-foreground">
                {scriptText}
              </p>
            ) : (
              <p className="text-sm text-foreground-subtle">{t.video.audioDetailNoScript}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
