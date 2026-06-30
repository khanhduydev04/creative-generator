// Client Component: admin-gated Apify task ID config and manual sync trigger with live status
"use client";

import { useAuth } from "@/features/auth/context";
import { isAdmin } from "@/features/auth/types";
import {
  useApifyConfig,
  useSaveApifyConfig,
  useSyncApify,
} from "@/hooks/api/useApifyConfig";
import { AlertCircle, CheckCircle2, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";

interface ApifySyncSectionProps {
  brandId: string | null;
}

export function ApifySyncSection({ brandId }: ApifySyncSectionProps) {
  const { profile } = useAuth();
  const canManage = Boolean(profile && isAdmin(profile.role));

  const configQuery = useApifyConfig(brandId);
  const saveMutation = useSaveApifyConfig(brandId ?? "");
  const syncMutation = useSyncApify(brandId ?? "");

  const config = configQuery.data ?? null;

  const [taskId, setTaskId] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (config) {
      setTaskId(config.apify_task_id);
      setIsEnabled(config.is_enabled);
    }
  }, [config]);

  if (!brandId) return null;

  async function handleSave() {
    if (!taskId.trim()) return;
    await saveMutation.mutateAsync({ apifyTaskId: taskId.trim(), isEnabled });
  }

  async function handleSync() {
    await syncMutation.mutateAsync();
  }

  const lastSynced = config?.last_synced_at
    ? new Date(config.last_synced_at).toLocaleString("vi-VN")
    : null;

  return (
    <div className="mt-12">
      <section className="relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-8 backdrop-blur-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <RefreshCw className="h-4.5 w-4.5 text-primary" />
              </div>
              Apify Sync
            </h3>
            <p className="text-foreground-muted text-sm mt-1">
              Đồng bộ video đối thủ từ TikTok qua Apify task
            </p>
          </div>

          <button
            onClick={() => void handleSync()}
            disabled={!config?.is_enabled || syncMutation.isPending || !brandId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            {syncMutation.isPending ? "Đang sync..." : "Sync ngay"}
          </button>
        </div>

        {/* Status */}
        <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
          {config?.last_error ? (
            <span className="flex items-center gap-1.5 text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Lỗi lần trước: {config.last_error}
            </span>
          ) : lastSynced ? (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Lần cuối sync: {lastSynced}
            </span>
          ) : (
            <span className="text-foreground-muted">Chưa sync lần nào</span>
          )}
          {syncMutation.isSuccess && (
            <span className="text-emerald-600 font-medium">
              ✓ Sync thành công ({syncMutation.data?.upserted ?? 0} video)
            </span>
          )}
          {syncMutation.isError && (
            <span className="text-red-500">
              Lỗi:{" "}
              {syncMutation.error instanceof Error
                ? syncMutation.error.message
                : "unknown"}
            </span>
          )}
        </div>

        {/* Admin config — hidden from members */}
        {canManage && (
          <div className="space-y-4 pt-4 border-t border-border-strong/20">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Bật tự động sync (cron)</label>
              <button
                type="button"
                onClick={() => setIsEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isEnabled ? "bg-primary" : "bg-border-strong"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Apify Task ID</label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Paste Apify task ID (ví dụ: ~abc123xyz)"
                className="w-full rounded-lg border border-border-strong/30 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void handleSave()}
                disabled={!taskId.trim() || saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-strong/30 text-sm font-medium disabled:opacity-50 hover:bg-primary/5 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
              {saveMutation.isSuccess && (
                <span className="text-sm text-emerald-600">✓ Đã lưu</span>
              )}
              {saveMutation.isError && (
                <span className="text-sm text-red-500">
                  Lỗi:{" "}
                  {saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : "unknown"}
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
