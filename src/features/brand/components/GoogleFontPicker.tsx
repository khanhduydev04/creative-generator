"use client";
// Client Component: Google Fonts picker with search + local multi-file font upload with specimen generation

import { SimpleModal } from "@/components/ui/SimpleModal";
import { useT } from "@/lib/i18n/useTranslation";
import { Check, FileText, Loader2, Search, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface GoogleFont {
  family: string;
  category: string;
  variants: string[];
}

interface LocalFontFile {
  file: File;
  variant: string;
}

interface GoogleFontPickerProps {
  value: string;
  brandId: string | null;
  fontSource: "google" | "local" | null;
  onSelect: (fontFamily: string, source: "google" | "local") => void;
}

const POPULAR_FONTS = [
  "Inter", "Roboto", "Open Sans", "Montserrat", "Lato", "Poppins",
  "Playfair Display", "Raleway", "Nunito", "Source Sans 3",
  "Oswald", "Merriweather", "PT Sans", "Noto Sans", "Ubuntu",
];

const GOOGLE_FONTS_URL = `/api/google-fonts`;

const SPECIMEN_TEXT = "Aa Bb Cc Dd Ee Ff Gg\n1234567890\nThe quick brown fox jumps\nover the lazy dog.";

export function GoogleFontPicker({ value, brandId, fontSource, onSelect }: GoogleFontPickerProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"google" | "local">("google");
  const [search, setSearch] = useState("");
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Local font state
  const [localFiles, setLocalFiles] = useState<LocalFontFile[]>([]);
  const [localFontName, setLocalFontName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchFonts = useCallback(async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(GOOGLE_FONTS_URL);
      if (!res.ok) throw new Error("Failed to load Google Fonts");
      const json = (await res.json()) as { items?: GoogleFont[] };
      setFonts(json.items ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load fonts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void fetchFonts();
  }, [open, fetchFonts]);

  const displayFonts = fonts.length > 0
    ? fonts
    : POPULAR_FONTS.map((f) => ({ family: f, category: "sans-serif", variants: ["regular"] }));

  const filtered = search.trim()
    ? displayFonts.filter((f) => f.family.toLowerCase().includes(search.toLowerCase()))
    : displayFonts;

  function selectGoogleFont(family: string) {
    onSelect(family, "google");
    setOpen(false);
  }

  function handleLocalFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newEntries: LocalFontFile[] = files.map((file) => ({
      file,
      variant: inferVariant(file.name),
    }));

    setLocalFiles((prev) => [...prev, ...newEntries]);

    // Auto-detect font name from first file if not set
    if (!localFontName && files[0]) {
      const name = files[0].name
        .replace(/\.(ttf|otf|woff|woff2)$/i, "")
        .replace(/[-_](Regular|Bold|Italic|Light|Medium|SemiBold|Thin|Black|Heavy|ExtraBold|ExtraLight)/gi, "")
        .replace(/[-_]/g, " ")
        .trim();
      setLocalFontName(name);
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  function removeLocalFile(index: number) {
    setLocalFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUploadLocalFont() {
    if (!brandId || localFiles.length === 0 || !localFontName.trim()) return;
    setUploading(true);
    setUploadError(null);

    try {
      // Generate specimen image via Canvas + @font-face
      const specimenBlob = await generateSpecimenImage(localFiles[0].file, localFontName);

      const formData = new FormData();
      formData.append("fontName", localFontName.trim());
      formData.append("variants", JSON.stringify(localFiles.map((f) => f.variant)));
      for (const entry of localFiles) {
        formData.append("files", entry.file);
      }
      if (specimenBlob) {
        formData.append("specimen", new File([specimenBlob], "specimen.png", { type: "image/png" }));
      }

      const res = await fetch(`/api/brand-kit/${brandId}/font`, {
        method: "POST",
        body: formData,
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      onSelect(localFontName.trim(), "local");
      setLocalFiles([]);
      setLocalFontName("");
      setOpen(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const displayValue = value || t.brandSetup.selectFont;
  const sourceLabel = fontSource === "local" ? t.brandSetup.localSuffix : "";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-border bg-background-subtle text-foreground px-3 py-2.5 text-sm text-left focus:border-primary focus:ring-1 focus:ring-primary outline-none hover:bg-background-elevated transition-colors flex items-center justify-between"
      >
        <span className={value ? "text-foreground" : "text-foreground-subtle"}>
          {displayValue}{sourceLabel}
        </span>
        <Search className="h-4 w-4 text-foreground-subtle" />
      </button>

      {open && (
        <SimpleModal
          title={t.brandSetup.chooseFontTitle}
          description={t.brandSetup.chooseFontDescription}
          onClose={() => setOpen(false)}
          maxWidth="max-w-lg"
        >
          {/* Tabs */}
          <div className="flex border-b border-border px-6">
            <button
              type="button"
              onClick={() => setTab("google")}
              className={"px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px " + (tab === "google" ? "border-primary text-primary" : "border-transparent text-foreground-subtle hover:text-foreground-muted")}
            >
              {t.brandSetup.googleFontsTab}
            </button>
            <button
              type="button"
              onClick={() => setTab("local")}
              className={"px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px " + (tab === "local" ? "border-primary text-primary" : "border-transparent text-foreground-subtle hover:text-foreground-muted")}
            >
              {t.brandSetup.uploadLocalFontTab}
            </button>
          </div>

          {tab === "google" && (
            <>
              <div className="px-6 pt-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.brandSetup.searchFontsPlaceholder}
                    autoFocus
                    className="w-full rounded-lg border border-border bg-background-subtle pl-9 pr-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                {loading && (
                  <div className="flex items-center justify-center py-8 text-foreground-subtle gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t.brandSetup.loadingFonts}</span>
                  </div>
                )}
                {loadError && !loading && (
                  <p className="text-sm text-amber-600 mt-2">{loadError}. {t.brandSetup.showingPopularFonts}</p>
                )}
              </div>
              <div className="px-6 pb-4 max-h-[360px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-sm text-foreground-subtle text-center py-4">{t.brandSetup.noFontsMatch} &quot;{search}&quot;</p>
                ) : (
                  <div className="space-y-0.5">
                    {filtered.slice(0, 100).map((font) => {
                      const isSelected = value === font.family && fontSource !== "local";
                      return (
                        <button
                          key={font.family}
                          type="button"
                          onClick={() => selectGoogleFont(font.family)}
                          className={
                            "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between " +
                            (isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-background-subtle text-foreground-muted")
                          }
                        >
                          <div>
                            <span className="font-medium">{font.family}</span>
                            <span className="ml-2 text-xs text-foreground-subtle">{font.category}</span>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "local" && (
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-1.5">
                  {t.brandSetup.fontFamilyNameLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={localFontName}
                  onChange={(e) => setLocalFontName(e.target.value)}
                  placeholder={t.brandSetup.fontFamilyNamePlaceholder}
                  className="w-full rounded-lg border border-border bg-background-subtle px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-1.5">
                  {t.brandSetup.fontFilesLabel} <span className="text-red-500">*</span>
                </label>
                <p className="text-[10px] text-foreground-subtle mb-2">
                  {t.brandSetup.fontFilesHint}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  multiple
                  className="sr-only"
                  onChange={handleLocalFilesChange}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-border text-sm font-semibold text-foreground-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <UploadCloud className="h-4 w-4" />
                  {t.brandSetup.addFontFilesBtn}
                </button>
              </div>

              {localFiles.length > 0 && (
                <div className="space-y-1.5">
                  {localFiles.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-background-subtle border border-border-subtle">
                      <FileText className="h-4 w-4 text-foreground-subtle shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground-muted truncate">{entry.file.name}</p>
                        <p className="text-[10px] text-foreground-subtle">{entry.variant} &middot; {(entry.file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <select
                        value={entry.variant}
                        onChange={(e) => {
                          setLocalFiles((prev) =>
                            prev.map((f, j) => (j === i ? { ...f, variant: e.target.value } : f))
                          );
                        }}
                        className="text-[10px] border border-border rounded px-1.5 py-1 bg-background-elevated text-foreground-muted"
                      >
                        {["Regular", "Bold", "Italic", "Bold Italic", "Light", "Medium", "SemiBold", "Thin", "Black"].map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeLocalFile(i)}
                        className="p-1 text-foreground-subtle hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

              {!brandId && (
                <p className="text-xs text-amber-600">{t.brandSetup.saveBrandFirst}</p>
              )}

              <button
                type="button"
                onClick={() => void handleUploadLocalFont()}
                disabled={!brandId || localFiles.length === 0 || !localFontName.trim() || uploading}
                className="w-full py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t.brandSetup.uploadingSpecimen}</>
                ) : (
                  <><UploadCloud className="h-4 w-4" /> {t.brandSetup.uploadFilesAndSave.replace("{0}", String(localFiles.length))}</>
                )}
              </button>
            </div>
          )}
        </SimpleModal>
      )}
    </div>
  );
}

function inferVariant(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("bolditalic") || (lower.includes("bold") && lower.includes("italic"))) return "Bold Italic";
  if (lower.includes("bold")) return "Bold";
  if (lower.includes("italic")) return "Italic";
  if (lower.includes("light")) return "Light";
  if (lower.includes("medium")) return "Medium";
  if (lower.includes("semibold") || lower.includes("semi-bold")) return "SemiBold";
  if (lower.includes("thin")) return "Thin";
  if (lower.includes("black") || lower.includes("heavy")) return "Black";
  return "Regular";
}

/**
 * Generate a font specimen image using Canvas + @font-face.
 * Renders sample text with the uploaded font so Gemini can "see" the typography.
 */
async function generateSpecimenImage(fontFile: File, fontName: string): Promise<Blob | null> {
  try {
    const buffer = await fontFile.arrayBuffer();
    const font = new FontFace(fontName, buffer);
    await font.load();
    document.fonts.add(font);

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 400);

    // Header: font name
    ctx.fillStyle = "#1e293b";
    ctx.font = `bold 24px "${fontName}", sans-serif`;
    ctx.fillText(`Font: ${fontName}`, 40, 50);

    // Separator
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(40, 65);
    ctx.lineTo(760, 65);
    ctx.stroke();

    // Large specimen
    ctx.fillStyle = "#0f172a";
    ctx.font = `48px "${fontName}", sans-serif`;
    ctx.fillText("Aa Bb Cc Dd Ee Ff Gg", 40, 120);

    // Medium text
    ctx.font = `32px "${fontName}", sans-serif`;
    ctx.fillText("1234567890 !@#$%", 40, 170);

    // Regular paragraph
    ctx.font = `20px "${fontName}", sans-serif`;
    ctx.fillStyle = "#334155";
    const lines = [
      "The quick brown fox jumps over the lazy dog.",
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "abcdefghijklmnopqrstuvwxyz",
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, 40, 220 + i * 32);
    });

    // Bold specimen
    ctx.font = `bold 20px "${fontName}", sans-serif`;
    ctx.fillStyle = "#1e293b";
    ctx.fillText("Bold: The quick brown fox jumps over the lazy dog.", 40, 340);

    // Italic specimen (if available)
    ctx.font = `italic 20px "${fontName}", sans-serif`;
    ctx.fillText("Italic: The quick brown fox jumps over the lazy dog.", 40, 375);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch {
    return null;
  }
}
