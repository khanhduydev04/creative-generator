// Client Component: uses state for filter, search, and modal
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApp } from "@/features/app/context";
import { useT } from "@/lib/i18n/useTranslation";
import {
  useCompetitorVideos,
  useAddCompetitorVideo,
  useUpdateVideoStatus,
} from "@/hooks/api/useCompetitorVideos";
import { VideoStatusFilter } from "@/features/video/components/VideoStatusFilter";
import { CompetitorVideoCard } from "@/features/video/components/CompetitorVideoCard";
import { AddVideoModal } from "@/features/video/components/AddVideoModal";
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

type FilterStatus = VideoStatus | "all";

export default function CompetitorVideosPage() {
  const { t } = useT();
  const { selectedBrandId } = useApp();
  const [activeStatus, setActiveStatus] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [datasetId, setDatasetId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: videos = [], isLoading } = useCompetitorVideos(selectedBrandId);
  const addVideo = useAddCompetitorVideo();
  const updateStatus = useUpdateVideoStatus();

  async function handleAddVideo(tiktokUrl: string) {
    if (!selectedBrandId) return;
    await addVideo.mutateAsync({ brandId: selectedBrandId, tiktokUrl });
  }

  async function handleSync() {
    if (!selectedBrandId || !datasetId.trim()) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await apiFetch<{ upserted: number }>("/api/video/sync-apify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId: selectedBrandId, apifyDatasetId: datasetId.trim() }),
      });
      setSyncMessage(t.video.syncSuccess.replace("{0}", String(result.upserted)));
      await queryClient.invalidateQueries({ queryKey: queryKeys.competitorVideos.list(selectedBrandId) });
      setTimeout(() => { setShowSyncModal(false); setSyncMessage(null); setDatasetId(""); }, 1500);
    } catch {
      setSyncMessage(t.video.syncFailed);
    } finally {
      setSyncing(false);
    }
  }

  async function handleStatusChange(videoId: string, status: VideoStatus) {
    if (!selectedBrandId) return;
    await updateStatus.mutateAsync({ videoId, status, brandId: selectedBrandId });
  }

  const filteredVideos = videos.filter((v: CompetitorVideo) => {
    if (activeStatus !== "all" && v.status !== activeStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        v.tiktok_url.toLowerCase().includes(q) ||
        (v.author_handle?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const counts: Record<FilterStatus, number> = {
    all: videos.length,
    pending: videos.filter((v: CompetitorVideo) => v.status === "pending").length,
    winner: videos.filter((v: CompetitorVideo) => v.status === "winner").length,
    rejected: videos.filter((v: CompetitorVideo) => v.status === "rejected").length,
  };

  return (
    <DashboardLayout activePath="/app/video">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t.video.pageTitle}</h1>
          {selectedBrandId && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSyncModal(true)}
                className="flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2.5 text-sm font-medium text-foreground-muted hover:bg-black/[0.04]"
              >
                {t.video.syncApify}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-violet-500"
              >
                <Plus className="h-4 w-4" />
                {t.video.addVideo}
              </button>
            </div>
          )}
        </div>

        {!selectedBrandId ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-border-strong/20 bg-background-subtle">
            <p className="text-sm text-foreground-muted">{t.video.noBrandSelected}</p>
          </div>
        ) : (
          <>
            {/* Filter + Search */}
            <div className="mb-6">
              <VideoStatusFilter
                activeStatus={activeStatus}
                onStatusChange={setActiveStatus}
                search={search}
                onSearchChange={setSearch}
                counts={counts}
              />
            </div>

            {/* Video table */}
            {isLoading ? (
              <div className="overflow-hidden rounded-2xl border border-border/20">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 animate-pulse border-b border-border/10 bg-background-elevated last:border-0" />
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-border-strong/20 bg-background-subtle text-center">
                <p className="text-sm font-medium text-foreground-muted">{t.video.noVideos}</p>
                <p className="max-w-xs text-xs text-foreground-subtle">{t.video.noVideosHint}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border/20">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border/20 bg-background-subtle">
                      <th className="py-2.5 pl-4 pr-3 text-xs font-medium text-foreground-subtle" />
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Video</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.views}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.likes}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.shares}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.comments}</th>
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Status</th>
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVideos.map((video: CompetitorVideo) => (
                      <CompetitorVideoCard
                        key={video.id}
                        video={video}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && selectedBrandId && (
        <AddVideoModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddVideo}
        />
      )}

      {showSyncModal && selectedBrandId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSyncModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border-strong/30 bg-background-elevated p-6 shadow-2xl"
          >
            <h3 className="mb-4 text-lg font-semibold text-foreground">{t.video.syncApify}</h3>
            <label className="mb-1 block text-sm font-medium text-foreground-muted">
              {t.video.apifyDatasetId}
            </label>
            <input
              type="text"
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              placeholder={t.video.apifyDatasetIdPlaceholder}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
            />
            {syncMessage && (
              <p className="mt-2 text-sm text-foreground-muted">{syncMessage}</p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-foreground-muted hover:text-foreground"
              >
                {t.video.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleSync()}
                disabled={!datasetId.trim() || syncing}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
              >
                {syncing ? t.video.syncing : t.video.syncApify}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
