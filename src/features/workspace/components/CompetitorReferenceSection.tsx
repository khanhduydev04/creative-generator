"use client";
// Client Component: upload competitor ad images (1-10 pack) for reference-based generation
// Supports sub-mode toggle: "standard" (traditional replication) vs "stealth" (scene planning)

import { useT } from "@/lib/i18n/useTranslation";
import { ImagePlus, Loader2, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

export type GenerationMode = "concept" | "competitor_ref";
export type CompetitorRefSubMode = "standard" | "stealth";

const MAX_PACK_SIZE = 10;

interface CompetitorReferenceSectionProps {
  mode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  competitorRefImageUrls: string[];
  onImagesChange: (urls: string[]) => void;
  competitorRefSubMode: CompetitorRefSubMode;
  onSubModeChange: (subMode: CompetitorRefSubMode) => void;
  sensitivityLevel: "normal" | "high";
  onSensitivityChange: (level: "normal" | "high") => void;
  audienceAgeRange: string;
  onAudienceAgeRangeChange: (range: string) => void;
}

export function CompetitorReferenceSection({
  mode,
  onModeChange,
  competitorRefImageUrls,
  onImagesChange,
  competitorRefSubMode,
  onSubModeChange,
  sensitivityLevel,
  onSensitivityChange,
  audienceAgeRange,
  onAudienceAgeRangeChange,
}: CompetitorReferenceSectionProps) {
  const { t } = useT();
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadedSoFar, setUploadedSoFar] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = uploadingCount > 0;

  async function resizeImageClient(file: File, maxWidth: number, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Blob conversion failed"))),
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
      img.src = url;
    });
  }

  async function uploadSingleFile(file: File): Promise<string | null> {
    let uploadBlob: Blob = await resizeImageClient(file, 2048, 0.85);
    if (uploadBlob.size > 3.5 * 1024 * 1024) {
      uploadBlob = await resizeImageClient(file, 1600, 0.7);
    }
    if (uploadBlob.size > 3.5 * 1024 * 1024) {
      uploadBlob = await resizeImageClient(file, 1200, 0.6);
    }

    const form = new FormData();
    const ext = file.name.replace(/\.[^.]+$/, "");
    form.append("file", new File([uploadBlob], `${ext}.jpg`, { type: "image/jpeg" }));
    const res = await fetch("/api/competitor-ref/upload", {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as { url?: string; error?: string };
    if (json.error) throw new Error(json.error);
    return json.url ?? null;
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = MAX_PACK_SIZE - competitorRefImageUrls.length;
    if (remaining <= 0) {
      window.alert(`Pack is full (max ${MAX_PACK_SIZE} references).`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      window.alert(
        `Only ${remaining} more image(s) allowed (max ${MAX_PACK_SIZE} total). Uploading first ${remaining}.`,
      );
    }

    setUploadingCount(toUpload.length);
    setUploadedSoFar(0);

    const newUrls: string[] = [];
    for (const file of toUpload) {
      try {
        const url = await uploadSingleFile(file);
        if (url) newUrls.push(url);
      } catch (err) {
        window.alert(
          "Upload failed for " + file.name + ": " + String(err instanceof Error ? err.message : err),
        );
      }
      setUploadedSoFar((prev) => prev + 1);
    }

    if (newUrls.length > 0) {
      onImagesChange([...competitorRefImageUrls, ...newUrls]);
    }

    setUploadingCount(0);
    setUploadedSoFar(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveImage(index: number) {
    onImagesChange(competitorRefImageUrls.filter((_, i) => i !== index));
  }

  const isActive = mode === "competitor_ref";
  const hasImages = competitorRefImageUrls.length > 0;
  const canAddMore = competitorRefImageUrls.length < MAX_PACK_SIZE;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-border-strong/30 space-y-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      {/* Mode Toggle */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">{t.workspace.generationMode}</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onModeChange("competitor_ref")}
            className={`px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all text-left ${
              isActive
                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                : "border-border text-foreground-muted hover:border-border-strong"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                isActive ? "border-primary" : "border-border-strong"
              }`}>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </div>
              {t.workspace.competitorRef}
            </div>
            <p className="text-[10px] text-foreground-subtle mt-1 ml-5.5">
              {t.workspace.competitorRefDesc}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("concept")}
            className={`px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all text-left ${
              !isActive
                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                : "border-border text-foreground-muted hover:border-border-strong"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                !isActive ? "border-primary" : "border-border-strong"
              }`}>
                {!isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </div>
              {t.workspace.conceptMode}
            </div>
            <p className="text-[10px] text-foreground-subtle mt-1 ml-5.5">
              {t.workspace.conceptModeDesc}
            </p>
          </button>
        </div>
      </div>

      {/* Competitor Ref Upload + Sub-mode — only when active */}
      {isActive && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground-muted">
                {t.workspace.competitorAdRefs} <span className="text-rose-500">*</span>
              </label>
              {hasImages && (
                <span className="text-[10px] font-semibold text-foreground-subtle">
                  {competitorRefImageUrls.length}/{MAX_PACK_SIZE}
                </span>
              )}
            </div>

            {/* Hidden file input (supports multiple) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => void handleFileUpload(e)}
              className="hidden"
            />

            {hasImages ? (
              <div className="space-y-2">
                {/* Thumbnail grid */}
                <div className="grid grid-cols-4 gap-2">
                  {competitorRefImageUrls.map((url, idx) => (
                    <div key={url} className="relative group aspect-square">
                      <img
                        src={url}
                        alt={`Reference ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove reference ${idx + 1}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1 rounded">
                        {idx + 1}
                      </span>
                    </div>
                  ))}

                  {/* Add more tile */}
                  {canAddMore && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="aspect-square rounded-lg border-2 border-dashed border-border text-foreground-subtle hover:border-primary hover:text-primary transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-1"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-[9px] font-semibold">
                            {uploadedSoFar}/{uploadingCount}
                          </span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span className="text-[9px] font-semibold">Add</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-foreground-subtle">
                  {competitorRefImageUrls.length === 1
                    ? "1 reference — add more to generate a pack (up to 10)"
                    : `${competitorRefImageUrls.length} references — each will be processed with the same config`}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full px-4 py-6 rounded-lg border-2 border-dashed border-border text-foreground-muted text-sm font-semibold hover:border-primary hover:text-primary transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Uploading {uploadedSoFar}/{uploadingCount}...</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6" />
                    <span>Upload competitor ad images</span>
                    <span className="text-[10px] text-foreground-subtle font-normal">
                      JPG, PNG, or WEBP — select 1-10 images for a pack
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Sub-mode Toggle: Standard vs Stealth */}
          <div>
            <label className="text-xs font-medium text-foreground-muted block mb-1.5">
              Ad Style
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onSubModeChange("standard")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                  competitorRefSubMode === "standard"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background-elevated text-foreground-muted hover:border-border-strong"
                }`}
              >
                Standard Ad
              </button>
              <button
                type="button"
                onClick={() => onSubModeChange("stealth")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                  competitorRefSubMode === "stealth"
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-border bg-background-elevated text-foreground-muted hover:border-border-strong"
                }`}
              >
                Stealth Ad
              </button>
            </div>
            <p className="text-xs text-foreground-subtle mt-1">
              {competitorRefSubMode === "stealth"
                ? "Analyze reference to plan stealth scene variations — looks like real content, not ads"
                : "Replicate & improve the reference ad layout with your product and brand"}
            </p>
          </div>

          {/* Stealth Tuning — only when stealth sub-mode */}
          {competitorRefSubMode === "stealth" && (
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold text-foreground-muted flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                Audience Tuning
              </h4>

              {/* Sensitivity Level */}
              <div>
                <label className="text-xs font-medium text-foreground-muted block mb-1.5">
                  Product Sensitivity
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSensitivityChange("normal")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      sensitivityLevel === "normal"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background-elevated text-foreground-muted hover:border-border-strong"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => onSensitivityChange("high")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      sensitivityLevel === "high"
                        ? "border-amber-600 bg-amber-600 text-white"
                        : "border-border bg-background-elevated text-foreground-muted hover:border-border-strong"
                    }`}
                  >
                    High (Body/Beauty)
                  </button>
                </div>
                <p className="text-xs text-foreground-subtle mt-1">
                  {sensitivityLevel === "high"
                    ? "Extra stealth: no body references, no transformation claims, lifestyle-only text"
                    : "Standard stealth mode for general products"}
                </p>
              </div>

              {/* Age Range */}
              <div>
                <label className="text-xs font-medium text-foreground-muted block mb-1.5">
                  Audience Age Range
                </label>
                <select
                  value={audienceAgeRange}
                  onChange={(e) => onAudienceAgeRangeChange(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-xs text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">Not specified</option>
                  <option value="18-25">18-25 (Young Adult)</option>
                  <option value="25-35">25-35 (Adult)</option>
                  <option value="35-45">35-45 (Middle-aged)</option>
                  <option value="40-55">40-55 (Mature)</option>
                  <option value="50+">50+ (Senior)</option>
                </select>
                <p className="text-xs text-foreground-subtle mt-1">
                  Adjusts scene props, text style, and platform authenticity
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
