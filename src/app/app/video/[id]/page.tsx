// Client Component: pipeline detail uses state for transcript init, SSE script generation
"use client";

import { use, useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useT } from "@/lib/i18n/useTranslation";
import { useApp } from "@/features/app/context";
import { VideoPlayer } from "@/features/video/components/VideoPlayer";
import { TranscriptEditor } from "@/features/video/components/TranscriptEditor";
import { ScriptEditor } from "@/features/video/components/ScriptEditor";
import { VoiceGenerationPanel } from "@/features/video/components/VoiceGenerationPanel";
import {
  useCreateTranscript,
  useTranscriptStatus,
} from "@/hooks/api/useTranscripts";
import { useScripts } from "@/hooks/api/useScripts";
import { apiFetch } from "@/lib/api";
import type { CompetitorVideo } from "@/features/video/types";

const DEFAULT_LOCALE = "vi-VN";

interface VideoDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ProductOption {
  id: string;
  name: string;
}

export default function VideoDetailPage({ params }: VideoDetailPageProps) {
  const { id } = use(params);
  const { t } = useT();
  const { selectedBrandId } = useApp();

  const [video, setVideo] = useState<CompetitorVideo | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [savedScriptId, setSavedScriptId] = useState<string | null>(null);

  const createTranscript = useCreateTranscript();
  const { data: transcript } = useTranscriptStatus(transcriptId);
  const { data: scripts = [] } = useScripts(transcriptId);
  const latestScript = scripts[0] ?? null;

  useEffect(() => {
    setLoadingVideo(true);
    apiFetch<{ videos: CompetitorVideo[] }>(
      `/api/video/competitors?brandId=${selectedBrandId ?? ""}`,
    )
      .then((data) => {
        const found = data.videos.find((v) => v.id === id) ?? null;
        setVideo(found);
      })
      .catch(() => setVideo(null))
      .finally(() => setLoadingVideo(false));
  }, [id, selectedBrandId]);

  useEffect(() => {
    if (!selectedBrandId) return;
    apiFetch<{ products: ProductOption[] }>(
      `/api/brand-products?brandId=${selectedBrandId}`,
    )
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, [selectedBrandId]);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ transcript: { id: string } | null }>(
      `/api/video/transcripts?videoId=${id}`,
    )
      .then((data) => {
        if (data.transcript) setTranscriptId(data.transcript.id);
      })
      .catch(() => null);
  }, [id]);

  async function handleCreateTranscript() {
    const data = await createTranscript.mutateAsync(id);
    setTranscriptId(data.transcript.id);
  }

  if (loadingVideo) {
    return (
      <DashboardLayout activePath="/app/video">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-foreground-muted">{t.video.loadingVideo}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!video) {
    return (
      <DashboardLayout activePath="/app/video">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-foreground-muted">{t.video.videoDetailNotFound}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePath="/app/video">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 max-w-xs">
          <VideoPlayer
            tiktokUrl={video.tiktok_url}
            fetchCdnPath={`/api/video/competitors/${video.id}/fetch-cdn`}
          />
        </div>
        <p className="mb-8 text-sm text-foreground-muted">
          {video.author_handle && `@${video.author_handle} · `}
          {video.views != null && `${video.views.toLocaleString()} ${t.video.views} · `}
          {video.scraped_at && new Date(video.scraped_at).toLocaleDateString(DEFAULT_LOCALE)}
        </p>

        <section className="mb-8 rounded-2xl border border-border-strong/20 bg-background-subtle p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t.video.stage3Title}
          </h2>
          <TranscriptEditor
            transcript={transcript ?? null}
            onCreateTranscript={handleCreateTranscript}
            isCreating={createTranscript.isPending}
          />
        </section>

        <section className="mb-8 rounded-2xl border border-border-strong/20 bg-background-subtle p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t.video.stage4Title}
          </h2>
          <ScriptEditor
            transcriptId={
              transcript?.whisper_status === "done" ? transcriptId : null
            }
            brandId={selectedBrandId ?? ""}
            products={products}
            latestScript={latestScript}
            onScriptCreated={setSavedScriptId}
          />
        </section>

        {/* Stage 5: Voice Generation */}
        <section className="rounded-2xl border border-border-strong/20 bg-background-subtle p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t.video.stage5Title}
          </h2>
          <VoiceGenerationPanel
            scriptId={savedScriptId}
            brandId={selectedBrandId ?? ""}
          />
        </section>
      </div>
    </DashboardLayout>
  );
}
