// Client Component: video card with preview, winner, reject actions
"use client";

import { useState } from "react";
import { Eye, Trophy, XCircle, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { VideoPlayer } from "@/features/video/components/VideoPlayer";
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";

const STATUS_BADGE: Record<VideoStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  winner: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
};

interface CompetitorVideoCardProps {
  video: CompetitorVideo;
  onStatusChange: (videoId: string, status: VideoStatus) => Promise<void>;
}

export function CompetitorVideoCard({ video, onStatusChange }: CompetitorVideoCardProps) {
  const { t } = useT();
  const [showPreview, setShowPreview] = useState(false);
  const [updating, setUpdating] = useState(false);

  const statusLabel: Record<VideoStatus, string> = {
    pending: t.video.statusPending,
    winner: t.video.statusWinner,
    rejected: t.video.statusRejected,
  };

  async function handleStatusChange(status: VideoStatus) {
    setUpdating(true);
    try {
      await onStatusChange(video.id, status);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-4 transition-colors hover:bg-background-elevated/30">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-background-elevated">
          {video.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.cover_url}
              alt={video.author_handle ?? "video"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-foreground-subtle">
              —
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {video.author_handle ? `@${video.author_handle}` : video.tiktok_url}
              </p>
              <p className="mt-0.5 text-xs text-foreground-subtle">
                {video.views != null && (
                  <span>
                    {video.views.toLocaleString()} {t.video.views}
                  </span>
                )}
                {video.likes != null && (
                  <span className="ml-2">
                    {video.likes.toLocaleString()} {t.video.likes}
                  </span>
                )}
                {video.scraped_at && (
                  <span className="ml-2">
                    {new Date(video.scraped_at).toLocaleDateString("vi-VN")}
                  </span>
                )}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[video.status]}`}
            >
              {statusLabel[video.status]}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
            >
              <Eye className="h-3.5 w-3.5" />
              {t.video.preview}
            </button>

            {video.status !== "winner" && (
              <button
                type="button"
                onClick={() => void handleStatusChange("winner")}
                disabled={updating}
                className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trophy className="h-3.5 w-3.5" />
                )}
                {t.video.markWinner}
              </button>
            )}

            {video.status !== "rejected" && (
              <button
                type="button"
                onClick={() => void handleStatusChange("rejected")}
                disabled={updating}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {t.video.reject}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline preview */}
      {showPreview && (
        <div className="mt-4 max-w-xs">
          <VideoPlayer
            videoId={video.video_id}
            tiktokUrl={video.tiktok_url}
            fetchCdnPath={`/api/video/competitors/${video.id}/fetch-cdn`}
          />
        </div>
      )}
    </div>
  );
}
