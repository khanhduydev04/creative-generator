// Client Component: audio library reads brand from context and manages delete state
"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApp } from "@/features/app/context";
import { useT } from "@/lib/i18n/useTranslation";
import { useGeneratedAudiosByBrand, useDeleteAudio } from "@/hooks/api/useGeneratedAudios";
import { AudioDetailModal } from "@/features/video/components/AudioDetailModal";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { GeneratedAudio } from "@/features/video/types";

const DISPLAY_LOCALE = "vi-VN";

export default function AudioLibraryPage() {
  const { t } = useT();
  const { selectedBrandId } = useApp();
  const { data: audios = [], isLoading } = useGeneratedAudiosByBrand(selectedBrandId);
  const deleteAudio = useDeleteAudio();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailAudio, setDetailAudio] = useState<GeneratedAudio | null>(null);

  const supabase = createBrowserSupabaseClient();

  function getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from("generated-audio").getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async function handleDelete(audio: GeneratedAudio) {
    setDeletingId(audio.id);
    try {
      await deleteAudio.mutateAsync({
        audioId: audio.id,
        scriptId: audio.script_id,
        brandId: audio.brand_id,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardLayout activePath="/app/video/audio">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">{t.video.audioLibraryTitle}</h1>

        {!selectedBrandId ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-border-strong/20 bg-background-subtle">
            <p className="text-sm text-foreground-muted">{t.video.noBrandSelected}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-background-elevated" />
            ))}
          </div>
        ) : audios.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-border-strong/20 bg-background-subtle">
            <p className="text-sm text-foreground-muted">{t.video.noAudiosYet}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border-strong/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-background-elevated/50 text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableScript}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">Sản phẩm</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableVoice}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableDuration}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableCreated}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {audios.map((audio) => {
                  const scriptText = audio.brand_script?.final_text ?? audio.brand_script?.raw_text ?? "—";
                  const publicUrl = audio.storage_path
                    ? getPublicUrl(audio.storage_path)
                    : (audio.vbee_audio_url ?? "");
                  const duration = audio.duration_secs
                    ? `${Math.floor(audio.duration_secs / 60)}:${String(Math.floor(audio.duration_secs % 60)).padStart(2, "0")}`
                    : "—";

                  return (
                    <tr
                      key={audio.id}
                      onClick={() => setDetailAudio(audio)}
                      className="cursor-pointer hover:bg-background-elevated/20"
                    >
                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-1 text-sm text-foreground">{scriptText}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">
                        {audio.brand_script?.brand_product?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">
                        {audio.voice_preset?.display_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">{duration}</td>
                      <td className="px-4 py-3 text-sm text-foreground-subtle">
                        {new Date(audio.created_at).toLocaleDateString(DISPLAY_LOCALE)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={publicUrl}
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="rounded px-2 py-1 text-xs text-primary hover:underline"
                          >
                            {t.video.downloadAudio}
                          </a>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(audio);
                            }}
                            disabled={deletingId === audio.id}
                            className="rounded px-2 py-1 text-xs text-red-400 hover:underline disabled:opacity-50"
                          >
                            {t.video.deleteAudio}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailAudio && (
        <AudioDetailModal
          audio={detailAudio}
          publicUrl={
            detailAudio.storage_path
              ? getPublicUrl(detailAudio.storage_path)
              : (detailAudio.vbee_audio_url ?? "")
          }
          onClose={() => setDetailAudio(null)}
        />
      )}
    </DashboardLayout>
  );
}
