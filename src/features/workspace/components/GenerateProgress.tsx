"use client";
// Client Component: displays generation pipeline progress with large step UI, streaming results, and bulk actions

import { ContentAdaptPanel } from "@/features/content-adapt/components/ContentAdaptPanel";
import { downloadAsZip } from "@/lib/download-zip";
import { useT } from "@/lib/i18n/useTranslation";
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────


// ─── Types ───────────────────────────────────────────────────────────────────

interface StepStatus {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
}

interface GenerationResult {
  imageUrl: string;
  taskId: string;
  prompt: string;
  headline: string;
  concept: string;
  market: string;
}

interface GenerationImageError {
  id: string;
  headline: string;
  concept: string;
  market: string;
  error: string;
  prompt?: string;
  imageInput?: string[];
  aspectRatio?: string;
  resolution?: string;
}

interface BrandContext {
  brandName: string;
  logoUrl?: string | null;
  primaryColor1: string;
  primaryColor2: string;
  secondaryColor1: string;
  secondaryColor2: string;
  accentColor1: string;
  accentColor2: string;
  typography: string;
}

interface ProductContext {
  productName: string;
  productDescription: string | null;
  productImages: string[];
}

interface GenerateProgressProps {
  isGenerating: boolean;
  steps: StepStatus[];
  results: GenerationResult[];
  failedImages: GenerationImageError[];
  onFailedImagesChange: (failed: GenerationImageError[]) => void;
  error: string | null;
  adCount: number;
  totalExpected: number;
  brandId: string;
  productId: string;
  productName: string;
  brandContext: BrandContext;
  productContext: ProductContext | null;
  aspectRatio?: string;
  language?: string;
  onRetry: () => void;
  onResultsChange: (results: GenerationResult[]) => void;
  currentPackIndex: number | null;
  totalPackRefs: number;
}

// ─── Step Config ─────────────────────────────────────────────────────────────

const STEP_CONFIG: Record<string, { label: string; description: string }> = {
  readProductPage: {
    label: "Product Analysis",
    description: "Reading and analyzing your product landing page",
  },
  readCompetitorSheet: {
    label: "Market Analysis",
    description: "Analyzing competitor ads in the selected market",
  },
  analyzeCompetitorAd: {
    label: "Competitor Analysis",
    description: "Analyzing competitor ad image for layout and style",
  },
  applyConceptSkill: {
    label: "Creative Strategy",
    description: "Applying concept and generating creative direction",
  },
  assemblePrompt: {
    label: "Prompt Assembly",
    description: "Building optimized image generation prompt",
  },
  generateImage: {
    label: "Image Generation",
    description: "Generating ad images with KIE AI",
  },
};

// ─── Saved state tracking ────────────────────────────────────────────────────

type SaveStatus = "unsaved" | "saving" | "saved";

// ─── Component ───────────────────────────────────────────────────────────────

export function GenerateProgress({
  isGenerating,
  steps,
  results,
  failedImages,
  onFailedImagesChange,
  error,
  adCount,
  totalExpected,
  brandId,
  productId,
  productName,
  brandContext,
  productContext,
  aspectRatio,
  language = "en-US",
  onRetry,
  onResultsChange,
  currentPackIndex,
  totalPackRefs,
}: GenerateProgressProps) {
  const { t } = useT();
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<GenerationResult | null>(
    null,
  );
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>(
    {},
  );
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [showAdaptPanel, setShowAdaptPanel] = useState(false);
  const [retryingIds, setRetryingIds] = useState<string[]>([]);

  // Retry a single failed image via /api/regenerate-image. On success the image
  // moves from the failed list into results; on failure the card's error updates.
  const handleRetryImage = useCallback(
    async (failed: GenerationImageError) => {
      if (!failed.prompt || retryingIds.includes(failed.id)) return;
      setRetryingIds((prev) => [...prev, failed.id]);
      try {
        const res = await fetch("/api/regenerate-image", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: failed.prompt,
            imageInput: failed.imageInput,
            aspectRatio: failed.aspectRatio,
            resolution: failed.resolution,
          }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          imageUrl?: string;
          taskId?: string;
          error?: string;
        };
        if (json.success && json.imageUrl && json.taskId) {
          onResultsChange([
            ...results,
            {
              imageUrl: json.imageUrl,
              taskId: json.taskId,
              prompt: failed.prompt,
              headline: failed.headline,
              concept: failed.concept,
              market: failed.market,
            },
          ]);
          onFailedImagesChange(failedImages.filter((f) => f.id !== failed.id));
        } else {
          onFailedImagesChange(
            failedImages.map((f) =>
              f.id === failed.id
                ? { ...f, error: json.error ?? "Retry failed" }
                : f,
            ),
          );
        }
      } catch (err) {
        onFailedImagesChange(
          failedImages.map((f) =>
            f.id === failed.id
              ? {
                  ...f,
                  error: err instanceof Error ? err.message : "Network error",
                }
              : f,
          ),
        );
      } finally {
        setRetryingIds((prev) => prev.filter((id) => id !== failed.id));
      }
    },
    [results, failedImages, onResultsChange, onFailedImagesChange, retryingIds],
  );

  function handleDismissError(id: string) {
    onFailedImagesChange(failedImages.filter((f) => f.id !== id));
  }

  // Reset save statuses when results change
  useEffect(() => {
    const initial: Record<string, SaveStatus> = {};
    for (const r of results) {
      initial[r.taskId] = saveStatuses[r.taskId] ?? "unsaved";
    }
    setSaveStatuses(initial);
    // Only re-init on results array identity change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  function handleCopyPrompt(prompt: string, taskId: string) {
    void navigator.clipboard.writeText(prompt);
    setCopiedPrompt(taskId);
    setTimeout(() => setCopiedPrompt(null), 2000);
  }

  function handleDelete(taskId: string) {
    const updated = results.filter((r) => r.taskId !== taskId);
    onResultsChange(updated);
    if (selectedResult?.taskId === taskId) {
      setSelectedResult(null);
    }
  }

  const handleSave = useCallback(
    async (result: GenerationResult) => {
      setSaveStatuses((prev) => ({ ...prev, [result.taskId]: "saving" }));

      try {
        const res = await fetch("/api/save-ad", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            imageUrl: result.imageUrl,
            prompt: result.prompt,
            headline: result.headline,
            concept: result.concept,
            market: result.market,
            brandId,
            productId,
            productName,
            source: "workspace",
          }),
        });

        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
        };
        if (json.success) {
          setSaveStatuses((prev) => ({ ...prev, [result.taskId]: "saved" }));
        } else {
          console.error("[save-ad] Failed:", json.error);
          setSaveStatuses((prev) => ({ ...prev, [result.taskId]: "unsaved" }));
        }
      } catch (err) {
        console.error("[save-ad] Error:", err);
        setSaveStatuses((prev) => ({ ...prev, [result.taskId]: "unsaved" }));
      }
    },
    [brandId, productId, productName],
  );

  function handleDownload(result: GenerationResult) {
    const filename = `ad-${result.taskId}.jpg`;
    const downloadUrl = `/api/download-image?url=${encodeURIComponent(result.imageUrl)}&filename=${encodeURIComponent(filename)}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Bulk Actions ──────────────────────────────────────────────────

  async function handleSaveAll() {
    const unsaved = results.filter(
      (r) =>
        saveStatuses[r.taskId] !== "saved" &&
        saveStatuses[r.taskId] !== "saving",
    );
    if (unsaved.length === 0) return;

    setIsSavingAll(true);
    await Promise.all(unsaved.map((r) => handleSave(r)));
    setIsSavingAll(false);
  }

  async function handleDownloadAll() {
    if (results.length === 0) return;
    setIsDownloadingAll(true);
    try {
      const items = results.map((r) => ({
        url: r.imageUrl,
        filename: `ad-${r.taskId}.jpg`,
      }));
      const timestamp = new Date().toISOString().slice(0, 10);
      await downloadAsZip(items, `ads-${timestamp}.zip`);
    } catch (err) {
      console.error("[workspace] ZIP download failed:", err);
    } finally {
      setIsDownloadingAll(false);
    }
  }

  const isAtGenerateStep = steps.some(
    (s) =>
      s.step === "generateImage" &&
      (s.status === "running" || s.status === "completed"),
  );

  const expectedCount = totalExpected || adCount;
  const remainingSkeletons = Math.max(
    0,
    expectedCount - results.length - failedImages.length,
  );
  const unsavedCount = results.filter(
    (r) => saveStatuses[r.taskId] !== "saved",
  ).length;

  // Empty state
  if (!isGenerating && results.length === 0 && failedImages.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-foreground-subtle">
        <div className="w-24 h-24 rounded-2xl bg-background-elevated flex items-center justify-center mb-4">
          <ImageIcon className="h-10 w-10 text-foreground-subtle" />
        </div>
        <p className="text-sm font-medium">No ads generated yet</p>
        <p className="text-xs mt-1">
          Fill in the form and click Generate to create your first ad.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Panel — Large step cards */}
      {isGenerating && (
        <div className="bg-background-elevated rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Generating your ads...
              </h3>
              <p className="text-xs text-foreground-muted">
                This usually takes 2 - 3 minutes
              </p>
            </div>
          </div>

          {/* Pack progress bar — only shown when processing multiple refs */}
          {totalPackRefs > 1 && currentPackIndex !== null && (
            <div className="bg-background-subtle rounded-lg px-4 py-3 mb-4 border border-border-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground-muted">
                  Reference {currentPackIndex + 1} of {totalPackRefs}
                </span>
                <span className="text-[10px] text-foreground-subtle">
                  {results.length} / {totalExpected} total ads
                </span>
              </div>
              <div className="w-full h-1.5 bg-background-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentPackIndex + 1) / totalPackRefs) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            {steps.map((step) => {
              const config = STEP_CONFIG[step.step];
              if (!config) return null;

              return (
                <div
                  key={step.step}
                  className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                    step.status === "running"
                      ? "bg-primary/5 border-primary/20 shadow-sm"
                      : step.status === "completed"
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : step.status === "failed"
                          ? "bg-rose-500/10 border-rose-500/20"
                          : "bg-background-subtle/50 border-border-subtle"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                      step.status === "running"
                        ? "bg-primary text-white"
                        : step.status === "completed"
                          ? "bg-emerald-500 text-white"
                          : step.status === "failed"
                            ? "bg-rose-500 text-white"
                            : "bg-background-elevated text-foreground-subtle"
                    }`}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    ) : step.status === "running" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : step.status === "failed" ? (
                      <XCircle className="h-4.5 w-4.5" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        step.status === "running"
                          ? "text-foreground"
                          : step.status === "completed"
                            ? "text-emerald-400"
                            : step.status === "failed"
                              ? "text-rose-400"
                              : "text-foreground-subtle"
                      }`}
                    >
                      {config.label}
                    </p>
                    <p className="text-[11px] text-foreground-subtle mt-0.5">
                      {step.message || config.description}
                    </p>
                  </div>

                  {step.status === "running" && (
                    <div className="flex gap-1 shrink-0">
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (() => {
        return (
          <div className="bg-rose-500/10 rounded-xl border border-rose-500/20 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-400">
                  {t.workspace.generationFailed}
                </p>
                <p className="text-xs text-rose-400 mt-1">{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t.workspace.retry}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Results + Skeletons — unified grid */}
      {(results.length > 0 ||
        failedImages.length > 0 ||
        (isGenerating && isAtGenerateStep)) && (
        <div>
          {/* Header with count + bulk actions */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
              {isGenerating
                ? `${results.length} / ${expectedCount} ${t.workspace.generated}`
                : `${results.length} ${t.workspace.results}`}
              {failedImages.length > 0 && (
                <span className="ml-2 text-rose-400 normal-case">
                  · {failedImages.length} {t.workspace.failed}
                </span>
              )}
            </p>

            {/* Bulk actions — visible when generation complete and results > 1 */}
            {!isGenerating && results.length > 1 && (
              <div className="flex gap-2">
                {unsavedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleSaveAll()}
                    disabled={isSavingAll}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-[10px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSavingAll ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Bookmark className="h-3 w-3" />
                    )}
                    {isSavingAll ? t.workspace.saving : `${t.workspace.saveAll} (${unsavedCount})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDownloadAll()}
                  disabled={isDownloadingAll}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground-muted text-[10px] font-semibold hover:bg-background-subtle transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDownloadingAll ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {isDownloadingAll
                    ? `${t.workspace.downloadAll}...`
                    : `${t.workspace.downloadAll} (${results.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdaptPanel(true)}
                  className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-[10px] font-semibold hover:bg-primary/10 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="h-3 w-3" />
                  {t.workspace.adaptContent}
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-3 grid-cols-3">
            {/* Actual results */}
            {results.map((result) => {
              const saveStatus = saveStatuses[result.taskId] ?? "unsaved";
              return (
                <div
                  key={result.taskId}
                  className="bg-background-elevated rounded-xl border border-border shadow-sm overflow-hidden group relative"
                >
                  {/* Saved badge */}
                  {saveStatus === "saved" && (
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t.workspace.saved}
                    </div>
                  )}

                  {/* Image — clickable for modal */}
                  <button
                    type="button"
                    onClick={() => setSelectedResult(result)}
                    className="block w-full aspect-square bg-background-elevated relative overflow-hidden cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.imageUrl}
                      alt={result.headline}
                      className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[10px] font-semibold px-3 py-1.5 rounded-full">
                        {t.workspace.viewDetails}
                      </span>
                    </div>
                  </button>

                  {/* Card info */}
                  <div className="p-3">
                    <p className="text-xs font-bold text-foreground mb-1.5 line-clamp-1">
                      &ldquo;{result.headline}&rdquo;
                    </p>
                    <div className="flex gap-1.5 mb-2.5">
                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-semibold rounded-full">
                        {result.concept}
                      </span>
                      <span className="px-1.5 py-0.5 bg-background-elevated text-foreground-muted text-[9px] font-semibold rounded-full">
                        {result.market}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5">
                      {saveStatus !== "saved" && (
                        <button
                          type="button"
                          onClick={() => void handleSave(result)}
                          disabled={saveStatus === "saving"}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-primary text-white text-[10px] font-semibold text-center hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {saveStatus === "saving" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Bookmark className="h-3 w-3" />
                          )}
                          {saveStatus === "saving" ? t.workspace.saving : t.workspace.save}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDownload(result)}
                        className={`${saveStatus === "saved" ? "flex-1" : ""} px-2 py-1.5 rounded-lg border border-border text-foreground-muted text-[10px] font-semibold hover:bg-background-subtle transition-colors flex items-center justify-center gap-1`}
                      >
                        <Download className="h-3 w-3" />
                        {t.workspace.download}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(result.taskId)}
                        className="px-2 py-1.5 rounded-lg border border-border text-foreground-subtle hover:text-rose-500 hover:border-rose-500/30 text-[10px] font-semibold transition-colors flex items-center justify-center"
                        title={t.workspace.removeFromResults}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Failed image cards */}
            {failedImages.map((failed) => {
              const isRetrying = retryingIds.includes(failed.id);
              return (
                <div
                  key={failed.id}
                  className="bg-rose-500/5 rounded-xl border border-rose-500/30 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="aspect-square bg-rose-500/5 relative flex items-center justify-center p-4">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                      </div>
                      <p className="text-[11px] font-semibold text-rose-400">
                        {t.workspace.generationFailed}
                      </p>
                      <p className="text-[10px] text-rose-400/80 line-clamp-4">
                        {failed.error}
                      </p>
                    </div>
                  </div>
                  <div className="p-3">
                    {failed.headline && (
                      <p className="text-xs font-bold text-foreground mb-1.5 line-clamp-1">
                        {failed.headline}
                      </p>
                    )}
                    <div className="flex gap-1.5">
                      {failed.prompt && (
                        <button
                          type="button"
                          onClick={() => void handleRetryImage(failed)}
                          disabled={isRetrying}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-primary text-white text-[10px] font-semibold text-center hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {isRetrying ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          {isRetrying ? t.workspace.generating : t.workspace.retry}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDismissError(failed.id)}
                        disabled={isRetrying}
                        className={`${failed.prompt ? "" : "flex-1"} px-2 py-1.5 rounded-lg border border-border text-foreground-subtle hover:text-rose-500 hover:border-rose-500/30 text-[10px] font-semibold transition-colors flex items-center justify-center disabled:opacity-50`}
                        title={t.workspace.removeFromResults}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Remaining skeletons (while generating) */}
            {isGenerating &&
              Array.from({ length: remainingSkeletons }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="bg-background-elevated rounded-xl border border-border shadow-sm overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-background-elevated relative flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-background-elevated flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-foreground-subtle" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 text-foreground-subtle animate-spin" />
                        <span className="text-[10px] text-foreground-subtle font-medium">
                          {t.workspace.generating}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="h-3.5 bg-background-elevated rounded-lg w-3/4" />
                    <div className="flex gap-1.5">
                      <div className="h-4 bg-background-elevated rounded-full w-14" />
                      <div className="h-4 bg-background-elevated rounded-full w-10" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─── Image Detail Modal ──────────────────────────────────────── */}
      {selectedResult && (
        <ImageDetailModal
          result={selectedResult}
          saveStatus={saveStatuses[selectedResult.taskId] ?? "unsaved"}
          copiedPrompt={copiedPrompt}
          brandContext={brandContext}
          productContext={productContext}
          aspectRatio={aspectRatio}
          onClose={() => setSelectedResult(null)}
          onSave={() => void handleSave(selectedResult)}
          onDownload={() => void handleDownload(selectedResult)}
          onDelete={() => handleDelete(selectedResult.taskId)}
          onCopyPrompt={() =>
            handleCopyPrompt(selectedResult.prompt, selectedResult.taskId)
          }
          onEditResult={(editedResult: GenerationResult) => {
            onResultsChange([editedResult, ...results]);
            setSelectedResult(editedResult);
          }}
        />
      )}

      {/* Content Adaptation Modal */}
      {showAdaptPanel && (
        <ContentAdaptPanel
          items={results.map((r) => ({
            imageUrl: r.imageUrl,
            identifier: r.taskId,
            label: r.headline,
          }))}
          mode="text-only"
          productData={
            productContext
              ? {
                  brandName: brandContext.brandName,
                  productName: productContext.productName,
                  claims: [],
                  benefits: [],
                  keyIngredients: [],
                  tone: "",
                  tagline: undefined,
                }
              : null
          }
          language={language}
          onClose={() => setShowAdaptPanel(false)}
        />
      )}
    </div>
  );
}

// ─── Image Detail Modal ──────────────────────────────────────────────────────

interface ImageDetailModalProps {
  result: GenerationResult;
  saveStatus: SaveStatus;
  copiedPrompt: string | null;
  brandContext: BrandContext;
  productContext: ProductContext | null;
  aspectRatio?: string;
  onClose: () => void;
  onSave: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onCopyPrompt: () => void;
  onEditResult: (result: GenerationResult) => void;
}

function ImageDetailModal({
  result,
  saveStatus,
  copiedPrompt,
  brandContext,
  productContext,
  aspectRatio,
  onClose,
  onSave,
  onDownload,
  onDelete,
  onCopyPrompt,
  onEditResult,
}: ImageDetailModalProps) {
  const { t } = useT();
  const [editPrompt, setEditPrompt] = useState("");
  const [editImages, setEditImages] = useState<File[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Close on Escape (only if not editing)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isEditing) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, isEditing]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !isEditing) onClose();
  }

  function handleEditImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    setEditImages((prev) => [...prev, ...newFiles].slice(0, 4));
    e.target.value = "";
  }

  function handleEditImageRemove(index: number) {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleEditSubmit() {
    if (!editPrompt.trim() || isEditing) return;

    setIsEditing(true);
    setEditError(null);

    try {
      // Convert uploaded images to data URLs
      const additionalImageUrls = await Promise.all(
        editImages.map((f) => fileToDataUrl(f)),
      );

      const res = await fetch("/api/edit-ad", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          originalImageUrl: result.imageUrl,
          editPrompt: editPrompt.trim(),
          originalPrompt: result.prompt,
          brandContext,
          productContext: productContext
            ? {
                productName: productContext.productName,
                productDescription: productContext.productDescription,
                productImages: productContext.productImages,
              }
            : {
                productName: result.headline,
                productDescription: null,
                productImages: [],
              },
          additionalImages:
            additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
          aspectRatio: aspectRatio ?? "1:1",
          resolution: "1K",
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        imageUrl?: string;
        taskId?: string;
        prompt?: string;
        error?: string;
      };

      if (json.success && json.imageUrl && json.taskId) {
        const editedResult: GenerationResult = {
          imageUrl: json.imageUrl,
          taskId: json.taskId,
          prompt: json.prompt ?? result.prompt,
          headline: result.headline,
          concept: result.concept + " (edited)",
          market: result.market,
        };
        setEditPrompt("");
        setEditImages([]);
        onEditResult(editedResult);
      } else {
        setEditError(json.error ?? "Edit failed");
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsEditing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 !m-0"
      onClick={handleBackdropClick}
    >
      <div className="bg-background-elevated rounded-2xl shadow-2xl w-full max-w-[1060px] flex max-h-[90vh] overflow-hidden">
        {/* Left — Image Preview */}
        <div className="flex-1 bg-background-elevated flex items-center justify-center p-6 min-w-0 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.imageUrl}
            alt={result.headline}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          />
          {/* Saved badge */}
          {saveStatus === "saved" && (
            <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t.workspace.savedToLibrary}
            </div>
          )}
          {/* Editing overlay */}
          {isEditing && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-3 bg-black/70 text-white px-5 py-3 rounded-xl">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-semibold">
                  {t.workspace.generatingEdited}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right — Details Panel */}
        <div className="w-[380px] shrink-0 flex flex-col border-l border-border">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-black text-foreground">{t.workspace.imageDetails}</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-background-elevated rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-foreground-subtle" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Edit Prompt Section */}
            <div>
              <label className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider block mb-2">
                {t.workspace.editThisAd}
              </label>
              <p className="text-[11px] text-foreground-subtle mb-2">
                {t.workspace.editDescription}
              </p>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder='e.g. "Change headline to 87% Saw Results in 14 Days" or "Add brand logo in top-right corner" or "Make background darker"'
                className="w-full h-[80px] px-3 py-2.5 rounded-lg border border-border bg-background-subtle text-xs text-foreground-muted placeholder:text-foreground-subtle resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                disabled={isEditing}
              />

              {/* Image upload area */}
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-[10px] text-foreground-subtle">
                    {t.workspace.attachImages}
                  </label>
                  {editImages.length < 4 && (
                    <label className="cursor-pointer text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5">
                      <Plus className="h-3 w-3" />
                      {t.workspace.add}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditImageAdd}
                        className="hidden"
                        disabled={isEditing}
                      />
                    </label>
                  )}
                </div>
                {editImages.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {editImages.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="relative w-14 h-14 rounded-lg border border-border overflow-hidden group/img"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleEditImageRemove(idx)}
                          className="absolute top-0 right-0 p-0.5 bg-black/60 rounded-bl-md opacity-0 group-hover/img:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <X className="h-2.5 w-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {editError && (
                <p className="text-[11px] text-rose-500 mt-1.5">{editError}</p>
              )}
              <button
                type="button"
                onClick={() => void handleEditSubmit()}
                disabled={!editPrompt.trim() || isEditing}
                className="w-full mt-2 py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t.workspace.generating}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    {t.workspace.applyEdit}
                  </>
                )}
              </button>
            </div>

            {/* Generation Prompt */}
            <div>
              <label className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider block mb-2">
                {t.workspace.generationPrompt}
              </label>
              <div className="bg-background-subtle rounded-lg p-3 text-xs text-foreground-muted leading-relaxed max-h-[100px] overflow-y-auto border border-border-subtle">
                {result.prompt.length > 500
                  ? result.prompt.substring(0, 500) + "..."
                  : result.prompt}
              </div>
              <button
                type="button"
                onClick={onCopyPrompt}
                className="mt-2 text-[11px] text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                {copiedPrompt === result.taskId
                  ? t.workspace.copied
                  : t.workspace.copyFullPrompt}
              </button>
            </div>

            {/* Primary Actions */}
            <div className="space-y-2">
              {saveStatus !== "saved" && (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saveStatus === "saving"}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saveStatus === "saving" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t.workspace.savingToLibrary}
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5" />
                      {t.workspace.saveToLibrary}
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onDownload}
                className="w-full py-2.5 rounded-xl border border-border text-foreground-muted text-xs font-bold hover:bg-background-subtle transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                {t.workspace.downloadImage}
              </button>
            </div>

            {/* Metadata */}
            <div>
              <label className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider block mb-2">
                {t.workspace.details}
              </label>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">{t.workspace.headline}</span>
                  <span className="text-foreground-muted font-medium text-right max-w-[180px] truncate">
                    {result.headline}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">{t.workspace.concept}</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full">
                    {result.concept}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">{t.workspace.market}</span>
                  <span className="text-foreground-muted font-medium">
                    {result.market}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">{t.workspace.status}</span>
                  <span
                    className={`font-semibold ${
                      saveStatus === "saved"
                        ? "text-emerald-400"
                        : "text-amber-500"
                    }`}
                  >
                    {saveStatus === "saved" ? t.workspace.saved : t.workspace.unsaved}
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-3 border-t border-border-subtle">
              <label className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider block mb-2">
                {t.workspace.dangerZone}
              </label>
              <button
                type="button"
                onClick={onDelete}
                className="w-full py-2 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.workspace.deleteImage}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
