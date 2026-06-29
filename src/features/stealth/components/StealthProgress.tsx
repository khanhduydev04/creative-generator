"use client";
// Client Component: displays stealth generation progress with step UI, streaming results, and bulk actions

import type { StealthGenerationResult } from "@/features/stealth/types";
import { ContentAdaptPanel } from "@/features/content-adapt/components/ContentAdaptPanel";
import { downloadAsZip } from "@/lib/download-zip";
import { useT } from "@/lib/i18n/useTranslation";
import {
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepStatus {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
}

type SaveStatus = "unsaved" | "saving" | "saved";

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

interface StealthProgressProps {
  isGenerating: boolean;
  steps: StepStatus[];
  results: StealthGenerationResult[];
  error: string | null;
  totalExpected: number;
  brandId: string;
  productId: string;
  productName: string;
  brandContext: BrandContext;
  productContext: ProductContext | null;
  aspectRatio?: string;
  language?: string;
  onRetry: () => void;
  onResultsChange: (results: StealthGenerationResult[]) => void;
  currentPackIndex?: number | null;
  totalPackRefs?: number;
}

// ─── Step Config ─────────────────────────────────────────────────────────────

const STEP_CONFIG: Record<string, { label: string; description: string }> = {
  planScenes: {
    label: "Scene Planning",
    description: "Analyzing reference and planning scene variations",
  },
  prepareImages: {
    label: "Image Preparation",
    description: "Resizing and uploading product images",
  },
  assemblePrompts: {
    label: "Prompt Assembly",
    description: "Building stealth scene prompts for KIE AI",
  },
  generateImages: {
    label: "Image Generation",
    description: "Generating stealth ad images with KIE AI",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function StealthProgress({
  isGenerating,
  steps,
  results,
  error,
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
  currentPackIndex = null,
  totalPackRefs = 1,
}: StealthProgressProps) {
  const { t } = useT();
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<StealthGenerationResult | null>(null);
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [showAdaptPanel, setShowAdaptPanel] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // Reset save statuses when results change
  useEffect(() => {
    const initial: Record<string, SaveStatus> = {};
    for (const r of results) {
      initial[r.taskId] = saveStatuses[r.taskId] ?? "unsaved";
    }
    setSaveStatuses(initial);
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
    async (result: StealthGenerationResult) => {
      setSaveStatuses((prev) => ({ ...prev, [result.taskId]: "saving" }));
      try {
        const res = await fetch("/api/save-ad", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            imageUrl: result.imageUrl,
            prompt: result.prompt,
            headline: result.sceneName,
            concept: `Stealth: ${result.sceneId}`,
            market: "",
            brandId,
            productId,
            productName,
            source: "stealth",
          }),
        });
        const json = (await res.json()) as { success?: boolean; error?: string };
        if (json.success) {
          setSaveStatuses((prev) => ({ ...prev, [result.taskId]: "saved" }));
        } else {
          console.error("[stealth save] Failed:", json.error);
          setSaveStatuses((prev) => ({ ...prev, [result.taskId]: "unsaved" }));
        }
      } catch (err) {
        console.error("[stealth save] Error:", err);
        setSaveStatuses((prev) => ({ ...prev, [result.taskId]: "unsaved" }));
      }
    },
    [brandId, productId, productName],
  );

  function handleDownload(result: StealthGenerationResult) {
    const filename = `stealth-${result.sceneId}-${result.taskId}.jpg`;
    const downloadUrl = `/api/download-image?url=${encodeURIComponent(result.imageUrl)}&filename=${encodeURIComponent(filename)}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleSaveAll() {
    const unsaved = results.filter(
      (r) => saveStatuses[r.taskId] !== "saved" && saveStatuses[r.taskId] !== "saving",
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
        filename: `stealth-${r.sceneId}-${r.taskId}.jpg`,
      }));
      const timestamp = new Date().toISOString().slice(0, 10);
      await downloadAsZip(items, `stealth-ads-${timestamp}.zip`);
    } catch (err) {
      console.error("[stealth] ZIP download failed:", err);
    } finally {
      setIsDownloadingAll(false);
    }
  }

  const isAtGenerateStep = steps.some(
    (s) => s.step === "generateImages" && (s.status === "running" || s.status === "completed"),
  );

  const remainingSkeletons = Math.max(0, totalExpected - results.length);
  const unsavedCount = results.filter((r) => saveStatuses[r.taskId] !== "saved").length;

  // Empty state
  if (!isGenerating && results.length === 0 && !error) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Progress Panel */}
      {isGenerating && (
        <div className="bg-background-elevated rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Generating stealth ads...</h3>
              <p className="text-xs text-foreground-muted">Creating images that look like everyday content</p>
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
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-500/10 rounded-xl border border-rose-500/20 p-5">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-400">{t.workspace.generationFailed}</p>
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
      )}

      {/* Results Grid */}
      {(results.length > 0 || (isGenerating && isAtGenerateStep)) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
              {isGenerating
                ? `${results.length} / ${totalExpected} ${t.workspace.generated}`
                : `${results.length} ${t.workspace.results}`}
            </p>
            {!isGenerating && results.length > 1 && (
              <div className="flex gap-2">
                {unsavedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleSaveAll()}
                    disabled={isSavingAll}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSavingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bookmark className="h-3 w-3" />}
                    {isSavingAll ? t.workspace.saving : `${t.workspace.saveAll} (${unsavedCount})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDownloadAll()}
                  disabled={isDownloadingAll}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground-muted text-xs font-semibold hover:bg-background-subtle transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDownloadingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  {isDownloadingAll ? `${t.workspace.downloadAll}...` : `${t.workspace.downloadAll} (${results.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdaptPanel(true)}
                  className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="h-3 w-3" />
                  {t.workspace.adaptContent}
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-3 grid-cols-3">
            {results.map((result) => {
              const saveStatus = saveStatuses[result.taskId] ?? "unsaved";
              return (
                <div
                  key={result.taskId}
                  className="bg-background-elevated rounded-xl border border-border shadow-sm overflow-hidden group relative"
                >
                  {saveStatus === "saved" && (
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t.workspace.saved}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedResult(result)}
                    className="block w-full aspect-square bg-background-elevated relative overflow-hidden cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.imageUrl}
                      alt={result.sceneName}
                      className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                        {t.workspace.viewDetails}
                      </span>
                    </div>
                  </button>

                  <div className="p-3">
                    <p className="text-xs font-bold text-foreground mb-1.5 line-clamp-1">
                      {result.sceneName}
                    </p>
                    <div className="flex gap-1.5 mb-2.5">
                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full">
                        {result.sceneId}
                      </span>
                      <span className="px-1.5 py-0.5 bg-background-elevated text-foreground-muted text-[10px] font-semibold rounded-full">
                        Stealth
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      {saveStatus !== "saved" && (
                        <button
                          type="button"
                          onClick={() => void handleSave(result)}
                          disabled={saveStatus === "saving"}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold text-center hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {saveStatus === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bookmark className="h-3 w-3" />}
                          {saveStatus === "saving" ? t.workspace.saving : t.workspace.save}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownload(result)}
                        className={`${saveStatus === "saved" ? "flex-1" : ""} px-2 py-1.5 rounded-lg border border-border text-foreground-muted text-xs font-semibold hover:bg-background-subtle transition-colors flex items-center justify-center gap-1`}
                      >
                        <Download className="h-3 w-3" />
                        {t.workspace.download}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(result.taskId)}
                        className="px-2 py-1.5 rounded-lg border border-border text-foreground-subtle hover:text-rose-500 hover:border-rose-500/30 text-xs font-semibold transition-colors flex items-center justify-center"
                        title={t.workspace.removeFromResults}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Skeletons */}
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
                        <span className="text-xs text-foreground-subtle font-medium">{t.workspace.generating}</span>
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

      {/* Detail Modal */}
      {selectedResult && (
        <StealthDetailModal
          result={selectedResult}
          saveStatus={saveStatuses[selectedResult.taskId] ?? "unsaved"}
          copiedPrompt={copiedPrompt}
          brandContext={brandContext}
          productContext={productContext}
          aspectRatio={aspectRatio}
          onClose={() => setSelectedResult(null)}
          onSave={() => void handleSave(selectedResult)}
          onDownload={() => handleDownload(selectedResult)}
          onDelete={() => handleDelete(selectedResult.taskId)}
          onCopyPrompt={() => handleCopyPrompt(selectedResult.prompt, selectedResult.taskId)}
          onEditResult={(editedResult) => {
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
            identifier: r.sceneId,
            label: r.sceneName,
          }))}
          mode="vision"
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

// ─── Detail Modal ────────────────────────────────────────────────────────────

interface StealthDetailModalProps {
  result: StealthGenerationResult;
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
  onEditResult: (editedResult: StealthGenerationResult) => void;
}

function StealthDetailModal({
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
}: StealthDetailModalProps) {
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
          productContext: productContext ?? {
            productName: result.sceneName,
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
        const editedResult: StealthGenerationResult = {
          imageUrl: json.imageUrl,
          taskId: json.taskId,
          prompt: json.prompt ?? result.prompt,
          sceneName: result.sceneName + " (edited)",
          sceneId: result.sceneId,
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
        {/* Left — Image */}
        <div className="flex-1 bg-background-elevated flex items-center justify-center p-6 min-w-0 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.imageUrl}
            alt={result.sceneName}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          />
          {saveStatus === "saved" && (
            <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t.workspace.savedToLibrary}
            </div>
          )}
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

        {/* Right — Details */}
        <div className="w-[380px] shrink-0 flex flex-col border-l border-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-black text-foreground">{t.stealth.adDetails}</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-background-elevated rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-foreground-subtle" />
            </button>
          </div>

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
                placeholder='e.g. "Make the product more visible" or "Change caption text" or "Make background warmer"'
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
                {copiedPrompt === result.taskId ? t.workspace.copied : t.workspace.copyFullPrompt}
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
                  <span className="text-foreground-subtle">{t.stealth.scene}</span>
                  <span className="text-foreground-muted font-medium">{result.sceneName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">{t.stealth.sceneId}</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full">
                    {result.sceneId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-subtle">{t.workspace.status}</span>
                  <span className={`font-semibold ${saveStatus === "saved" ? "text-emerald-400" : "text-amber-500"}`}>
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
