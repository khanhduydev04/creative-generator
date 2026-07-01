// Client Component: uses state for filter, search, pagination, and modal
"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApp } from "@/features/app/context";
import { useT } from "@/lib/i18n/useTranslation";
import {
  useCompetitorVideos,
  useAddCompetitorVideo,
  useUpdateVideoStatus,
  useBulkUpdateVideoStatus,
  useBulkDeleteVideos,
} from "@/hooks/api/useCompetitorVideos";
import { VideoStatusFilter } from "@/features/video/components/VideoStatusFilter";
import { CompetitorVideoCard } from "@/features/video/components/CompetitorVideoCard";
import { AddVideoModal } from "@/features/video/components/AddVideoModal";
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

const PAGE_SIZE = 20;

export default function CompetitorVideosPage() {
  const { t } = useT();
  const { selectedBrandId } = useApp();
  const [activeStatus, setActiveStatus] = useState<VideoStatus>("pending");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Debounce search to avoid a request per keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const queryClient = useQueryClient();
  const { data, isLoading } = useCompetitorVideos(
    selectedBrandId,
    activeStatus,
    page,
    debouncedSearch || undefined,
  );
  const videos: CompetitorVideo[] = data?.videos ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filteredVideos = videos;

  const addVideo = useAddCompetitorVideo();
  const updateStatus = useUpdateVideoStatus();
  const bulkUpdateStatus = useBulkUpdateVideoStatus();
  const bulkDeleteVideos = useBulkDeleteVideos();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectable = activeStatus !== "winner";

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeStatus, page, debouncedSearch]);

  function handleStatusChange(status: VideoStatus) {
    setActiveStatus(status);
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) =>
      prev.size === filteredVideos.length ? new Set() : new Set(filteredVideos.map((v) => v.id)),
    );
  }

  async function handleBulkStatusChange(status: "winner" | "rejected") {
    if (!selectedBrandId || selectedIds.size === 0) return;
    try {
      await bulkUpdateStatus.mutateAsync({ ids: Array.from(selectedIds), status, brandId: selectedBrandId });
      setSelectedIds(new Set());
    } catch (err) {
      window.alert(t.video.bulkActionFailed + " " + String(err instanceof Error ? err.message : err));
    }
  }

  async function handleBulkDelete() {
    if (!selectedBrandId || selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(t.video.bulkDeleteConfirm.replace("{0}", String(count)))) return;
    try {
      await bulkDeleteVideos.mutateAsync({ ids: Array.from(selectedIds), brandId: selectedBrandId });
      setSelectedIds(new Set());
    } catch (err) {
      window.alert(t.video.bulkActionFailed + " " + String(err instanceof Error ? err.message : err));
    }
  }

  async function handleAddVideo(tiktokUrl: string) {
    if (!selectedBrandId) return;
    await addVideo.mutateAsync({ brandId: selectedBrandId, tiktokUrl });
  }

  async function handleSync() {
    if (!selectedBrandId) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await apiFetch<{ upserted: number }>("/api/video/apify-config/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId: selectedBrandId }),
      });
      setSyncMessage(t.video.syncSuccess.replace("{0}", String(result.upserted)));
      await queryClient.invalidateQueries({ queryKey: queryKeys.competitorVideos.all(selectedBrandId) });
      setTimeout(() => { setShowSyncModal(false); setSyncMessage(null); }, 1500);
    } catch {
      setSyncMessage(t.video.syncFailed);
    } finally {
      setSyncing(false);
    }
  }

  async function handleStatusChange2(videoId: string, status: VideoStatus) {
    if (!selectedBrandId) return;
    await updateStatus.mutateAsync({ videoId, status, brandId: selectedBrandId });
  }

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
                <RefreshCw className="h-4 w-4" />
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
                onStatusChange={handleStatusChange}
                search={search}
                onSearchChange={handleSearchChange}
                activeTotal={total}
              />
            </div>

            {selectable && selectedIds.size > 0 && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <button
                  type="button"
                  onClick={toggleSelectAllOnPage}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t.video.selectAllOnPage}
                </button>
                <span className="text-xs text-foreground-muted">
                  {selectedIds.size} {t.library.selectedCount}
                </span>
                <div className="flex-1" />
                {activeStatus === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleBulkStatusChange("winner")}
                      disabled={bulkUpdateStatus.isPending}
                      className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-500/20 disabled:opacity-50"
                    >
                      {t.video.bulkMarkWinner.replace("{0}", String(selectedIds.size))}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleBulkStatusChange("rejected")}
                      disabled={bulkUpdateStatus.isPending}
                      className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {t.video.bulkReject.replace("{0}", String(selectedIds.size))}
                    </button>
                  </>
                )}
                {activeStatus === "rejected" && (
                  <button
                    type="button"
                    onClick={() => void handleBulkDelete()}
                    disabled={bulkDeleteVideos.isPending}
                    className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    {t.video.bulkDeletePermanently.replace("{0}", String(selectedIds.size))}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1.5 hover:bg-background-elevated rounded-lg transition-colors"
                  title={t.library.clearSelection}
                >
                  <X className="h-4 w-4 text-foreground-subtle" />
                </button>
              </div>
            )}

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
                      {selectable && (
                        <th className="py-2.5 pl-4 pr-2 w-8">
                          <input
                            type="checkbox"
                            checked={filteredVideos.length > 0 && selectedIds.size === filteredVideos.length}
                            onChange={toggleSelectAllOnPage}
                            className="h-4 w-4 rounded border-border/40 accent-primary"
                          />
                        </th>
                      )}
                      {!selectable && (
                        <th className="py-2.5 pl-4 pr-3 text-xs font-medium text-foreground-subtle" />
                      )}
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Video</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.views}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.likes}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.shares}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.comments}</th>
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Status</th>
                      {activeStatus === "winner" && (
                        <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">{t.video.pipelineColumnHeader}</th>
                      )}
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVideos.map((video: CompetitorVideo) => (
                      <CompetitorVideoCard
                        key={video.id}
                        video={video}
                        onStatusChange={handleStatusChange2}
                        selectable={selectable}
                        selected={selectedIds.has(video.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-foreground-subtle">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-foreground-muted transition-colors hover:bg-black/[0.04] disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-3 text-sm text-foreground-muted">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-foreground-muted transition-colors hover:bg-black/[0.04] disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
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
          onClick={() => !syncing && setShowSyncModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border-strong/30 bg-background-elevated p-6 shadow-2xl"
          >
            <h3 className="mb-2 text-lg font-semibold text-foreground">{t.video.syncApify}</h3>
            <p className="mb-5 text-sm text-foreground-muted">{t.video.syncApifyDesc}</p>
            {syncMessage && (
              <p className="mb-4 text-sm text-foreground-muted">{syncMessage}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                disabled={syncing}
                className="rounded-lg px-4 py-2 text-sm text-foreground-muted hover:text-foreground disabled:opacity-50"
              >
                {t.workspace.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleSync()}
                disabled={syncing}
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
