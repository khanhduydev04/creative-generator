// Client Component: iframe embed with CDN video fallback on load error
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n/useTranslation";

type PlayerState = "embed" | "loading-cdn" | "cdn" | "failed";

interface VideoPlayerProps {
  videoId: string | null;
  tiktokUrl: string;
  fetchCdnPath: string;
}

export function VideoPlayer({ videoId, tiktokUrl, fetchCdnPath }: VideoPlayerProps) {
  const { t } = useT();
  const [state, setState] = useState<PlayerState>(videoId ? "embed" : "loading-cdn");
  const [cdnUrl, setCdnUrl] = useState<string | null>(null);
  const cdnFetchedRef = useRef(false);

  const loadCdn = useCallback(async () => {
    if (cdnFetchedRef.current) return;
    cdnFetchedRef.current = true;
    setState("loading-cdn");
    try {
      const res = await apiFetch<{ cdnUrl: string | null }>(fetchCdnPath);
      if (res.cdnUrl) {
        setCdnUrl(res.cdnUrl);
        setState("cdn");
      } else {
        setState("failed");
      }
    } catch {
      setState("failed");
    }
  }, [fetchCdnPath]);

  useEffect(() => {
    if (!videoId) {
      void loadCdn();
    }
  }, [videoId, loadCdn]);

  if (state === "embed" && videoId) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl bg-black"
        style={{ paddingBottom: "177.78%" }}
      >
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          onError={() => void loadCdn()}
          title="TikTok video"
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

  if (state === "loading-cdn") {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-xl bg-black/10">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
        <span className="ml-2 text-sm text-foreground-muted">{t.video.loadingCdn}</span>
      </div>
    );
  }

  if (state === "cdn" && cdnUrl) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl bg-black"
        style={{ paddingBottom: "177.78%" }}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={cdnUrl}
          controls
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
    <div className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl bg-black/10 text-center">
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
