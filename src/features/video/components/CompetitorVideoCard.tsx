// Client Component: table row with preview modal, winner/reject actions
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Trophy, XCircle, Loader2, X, Play, ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { VideoPlayer } from "@/features/video/components/VideoPlayer";
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";

const STATUS_BADGE: Record<VideoStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-600",
  winner: "bg-green-500/15 text-green-600",
  rejected: "bg-red-500/15 text-red-500",
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
    <>
      <tr className="border-b border-border/20 transition-colors hover:bg-black/[0.02]">
        {/* Thumbnail */}
        <td className="py-2 pl-4 pr-3 w-12">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="group relative h-16 w-10 overflow-hidden rounded-lg bg-background-elevated block"
          >
            {video.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.cover_url}
                alt={video.author_handle ?? "video"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-foreground-subtle">—</div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="h-4 w-4 fill-white text-white" />
            </div>
          </button>
        </td>

        {/* Author + date */}
        <td className="py-2 pr-4 min-w-[120px]">
          <a
            href={video.tiktok_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-medium text-foreground hover:underline truncate max-w-[160px]"
          >
            {video.author_handle ? `@${video.author_handle}` : "—"}
          </a>
          {video.scraped_at && (
            <p className="text-xs text-foreground-subtle">
              {new Date(video.scraped_at).toLocaleDateString("vi-VN")}
            </p>
          )}
        </td>

        {/* Views */}
        <td className="py-2 pr-4 text-sm text-right tabular-nums text-foreground">
          {video.views != null ? video.views.toLocaleString("vi-VN") : "—"}
        </td>

        {/* Likes */}
        <td className="py-2 pr-4 text-sm text-right tabular-nums text-foreground">
          {video.likes != null ? video.likes.toLocaleString("vi-VN") : "—"}
        </td>

        {/* Shares */}
        <td className="py-2 pr-4 text-sm text-right tabular-nums text-foreground">
          {video.shares != null ? video.shares.toLocaleString("vi-VN") : "—"}
        </td>

        {/* Comments */}
        <td className="py-2 pr-4 text-sm text-right tabular-nums text-foreground">
          {video.comments != null ? video.comments.toLocaleString("vi-VN") : "—"}
        </td>

        {/* Status */}
        <td className="py-2 pr-4">
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[video.status]}`}>
            {statusLabel[video.status]}
          </span>
        </td>

        {/* Actions */}
        <td className="py-2 pr-4">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/app/video/${video.id}`}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                video.status === "winner"
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "text-foreground-subtle hover:bg-black/[0.04]"
              }`}
            >
              {t.video.openPipeline}
              <ArrowRight className="h-3 w-3" />
            </Link>
            {video.status !== "winner" && (
              <button
                type="button"
                onClick={() => void handleStatusChange("winner")}
                disabled={updating}
                className="flex items-center gap-1 rounded-lg bg-green-500/10 px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-green-500/20 disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trophy className="h-3 w-3" />
                )}
                {t.video.markWinner}
              </button>
            )}
            {video.status !== "rejected" && (
              <button
                type="button"
                onClick={() => void handleStatusChange("rejected")}
                disabled={updating}
                className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/20 disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {t.video.reject}
              </button>
            )}
          </div>
        </td>
      </tr>

      {showPreview &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[320px]"
            >
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="absolute -top-10 right-0 flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
                Đóng
              </button>
              <VideoPlayer
                tiktokUrl={video.tiktok_url}
                fetchCdnPath={`/api/video/competitors/${video.id}/fetch-cdn`}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
