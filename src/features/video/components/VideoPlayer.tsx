// Client Component: fetches CDN URL via tikwm on mount, plays video natively
"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n/useTranslation";

type PlayerState = "loading" | "loaded" | "failed";

interface VideoPlayerProps {
  tiktokUrl: string;
  fetchCdnPath: string;
  /** Pre-resolved CDN URL — if provided, skips the fetch-cdn API call. */
  initialCdnUrl?: string | null;
  onCdnResolved?: (url: string) => void;
}

export function VideoPlayer({ tiktokUrl, fetchCdnPath, initialCdnUrl, onCdnResolved }: VideoPlayerProps) {
  const { t } = useT();
  const [state, setState] = useState<PlayerState>(initialCdnUrl ? "loaded" : "loading");
  const [cdnUrl, setCdnUrl] = useState<string | null>(initialCdnUrl ?? null);

  useEffect(() => {
    if (initialCdnUrl) return;
    let cancelled = false;
    async function fetchCdn() {
      try {
        const res = await apiFetch<{ cdnUrl: string | null }>(fetchCdnPath);
        if (cancelled) return;
        if (res.cdnUrl) {
          setCdnUrl(res.cdnUrl);
          setState("loaded");
          onCdnResolved?.(res.cdnUrl);
        } else {
          setState("failed");
        }
      } catch {
        if (!cancelled) setState("failed");
      }
    }
    void fetchCdn();
    return () => {
      cancelled = true;
    };
  }, [fetchCdnPath, initialCdnUrl, onCdnResolved]);

  if (state === "loading") {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl bg-black/10">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
        <span className="ml-2 text-sm text-foreground-muted">{t.video.loadingCdn}</span>
      </div>
    );
  }

  if (state === "loaded" && cdnUrl) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl bg-black"
        style={{ paddingBottom: "177.78%" }}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={cdnUrl}
          controls
          autoPlay
          preload="metadata"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <a
          href={tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs text-white hover:bg-black/90"
        >
          <ExternalLink className="h-3 w-3" />
          {t.video.openTikTok}
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-xl bg-black/10 text-center">
      <p className="text-sm text-foreground-muted">{t.video.cdnFailed}</p>
      <a
        href={tiktokUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500"
      >
        <ExternalLink className="h-4 w-4" />
        {t.video.openTikTok}
      </a>
    </div>
  );
}
