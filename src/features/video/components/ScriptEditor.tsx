// Client Component: SSE script generation with streaming textarea + save action
"use client";

import { useState, useRef } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { usePatchScript } from "@/hooks/api/useScripts";
import type { BrandScript, CreateScriptRequest } from "@/features/video/types";
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";

interface ProductOption {
  id: string;
  name: string;
  attributes: string | null;
  target_audience: string | null;
  selling_points: string | null;
}

interface ScriptEditorProps {
  transcriptId: string | null;
  brandId: string;
  products: ProductOption[];
  scripts: BrandScript[];
  onScriptCreated: (scriptId: string) => void;
}

const TONE_OPTIONS = ["humor", "authentic", "dramatic"] as const;
type Tone = (typeof TONE_OPTIONS)[number];

const SAVE_FEEDBACK_DURATION_MS = 2_000;
const SSE_SPLIT_SEPARATOR = "\n\n";
const SSE_EVENT_PREFIX = "event:";
const SSE_DATA_PREFIX = "data:";

function formatScriptVersionLabel(createdAt: string): string {
  const date = new Date(createdAt);
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const day = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `${time} ${day}`;
}

export function ScriptEditor({
  transcriptId,
  brandId,
  products,
  scripts,
  onScriptCreated,
}: ScriptEditorProps) {
  const { t } = useT();
  const patchScript = usePatchScript();
  const abortRef = useRef<AbortController | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("authentic");
  const [notes, setNotes] = useState("");
  const [attributes, setAttributes] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [savedScriptId, setSavedScriptId] = useState<string | null>(scripts[0]?.id ?? null);
  const [editedFinalText, setEditedFinalText] = useState(scripts[0]?.final_text ?? "");
  const [saved, setSaved] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>("vbee");
  const [elevenLabsModel, setElevenLabsModel] = useState<ElevenLabsModel>("eleven_flash_v2_5");

  const toneLabels: Record<Tone, string> = {
    humor: t.video.toneHumor,
    authentic: t.video.toneAuthentic,
    dramatic: t.video.toneDramatic,
  };

  function handleSelectProduct(productId: string) {
    const id = productId || null;
    setSelectedProductId(id);
    const product = products.find((p) => p.id === id);
    setAttributes(product?.attributes ?? "");
    setTargetAudience(product?.target_audience ?? "");
    setSellingPoints(product?.selling_points ?? "");
  }

  async function handleGenerate() {
    if (!transcriptId) return;
    setStreamError(null);
    setStreamedText("");
    setIsGenerating(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const payload: CreateScriptRequest = {
      transcriptId,
      brandId,
      productId: selectedProductId,
      promptConfig: {
        tone,
        notes,
        attributes: attributes.trim() || null,
        targetAudience: targetAudience.trim() || null,
        sellingPoints: sellingPoints.trim() || null,
        ttsProvider,
        elevenLabsModel: ttsProvider === "elevenlabs" ? elevenLabsModel : null,
      },
    };

    try {
      const res = await fetch("/api/video/scripts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        setStreamError(t.video.scriptStreamError);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(SSE_SPLIT_SEPARATOR);
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((line) => line.startsWith(SSE_EVENT_PREFIX));
          const dataLine = lines.find((line) => line.startsWith(SSE_DATA_PREFIX));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.slice(SSE_EVENT_PREFIX.length).trim();
          // Type assertion is safe: SSE event data is always a JSON object from the server
          const data = JSON.parse(dataLine.slice(SSE_DATA_PREFIX.length).trim()) as Record<string, unknown>;

          if (event === "token" && typeof data.text === "string") {
            setStreamedText((prev) => prev + data.text);
          } else if (event === "done" && typeof data.scriptId === "string") {
            setSavedScriptId(data.scriptId);
            onScriptCreated(data.scriptId);
            setEditedFinalText(typeof data.rawText === "string" ? data.rawText : "");
          } else if (event === "error") {
            setStreamError(t.video.scriptStreamError);
          }
        }
      }
    } catch (error) {
      // Type assertion is safe: error is always an Error object or AbortError from fetch
      if ((error as Error).name !== "AbortError") {
        setStreamError(t.video.scriptStreamError);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!savedScriptId) return;
    await patchScript.mutateAsync({
      scriptId: savedScriptId,
      finalText: editedFinalText,
      transcriptId: transcriptId ?? "",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), SAVE_FEEDBACK_DURATION_MS);
  }

  function handleSelectVersion(scriptId: string) {
    const script = scripts.find((s) => s.id === scriptId);
    if (!script) return;
    setSavedScriptId(script.id);
    setEditedFinalText(script.final_text ?? script.raw_text ?? "");
    setSaved(false);
    onScriptCreated(script.id);
  }

  const displayText = isGenerating ? streamedText : editedFinalText;
  const isSaving = patchScript.isPending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-muted">
            {t.video.selectProduct}
          </label>
          <select
            value={selectedProductId ?? ""}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">{t.video.noProduct}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-muted">
            {t.video.tone}
          </label>
          <select
            value={tone}
            // Safe: select options are rendered exclusively from TONE_OPTIONS, so the value is always a valid Tone
            onChange={(e) => setTone(e.target.value as Tone)}
            className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {TONE_OPTIONS.map((toneOption) => (
              <option key={toneOption} value={toneOption}>{toneLabels[toneOption]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-muted">
            {t.video.scriptNotes}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* TTS Provider */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
          Định dạng giọng đọc
        </label>
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(["vbee", "elevenlabs"] as TtsProvider[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTtsProvider(p)}
              className={`flex-1 py-1.5 font-medium transition-colors ${
                ttsProvider === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground-muted hover:bg-background-elevated"
              }`}
            >
              {p === "vbee" ? "Vbee" : "ElevenLabs"}
            </button>
          ))}
        </div>
      </div>

      {/* ElevenLabs model — only shown when elevenlabs is selected */}
      {ttsProvider === "elevenlabs" && (
        <div className="mb-3">
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
            Model ElevenLabs
          </label>
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {(["eleven_v3", "eleven_flash_v2_5"] as ElevenLabsModel[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setElevenLabsModel(m)}
                className={`flex-1 py-1.5 font-medium transition-colors ${
                  elevenLabsModel === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground-muted hover:bg-background-elevated"
                }`}
              >
                {m === "eleven_v3" ? "v3 (Expression tags)" : "v2.5 (Flash)"}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-foreground-subtle mt-1">
            v3 hỗ trợ [chuckles], [amused]… — v2.5 dùng CAPS và dấu câu
          </p>
        </div>
      )}

      {selectedProductId && (
        <details key={selectedProductId ?? ""} className="rounded-xl border border-border/40 bg-background-subtle p-3" open>
          <summary className="cursor-pointer text-sm font-medium text-foreground-muted">
            {t.video.productConfigTitle}
          </summary>
          <p className="mt-1 mb-3 text-xs text-foreground-subtle">{t.video.productConfigHint}</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">{t.video.attributesLabel}</label>
              <textarea value={attributes} onChange={(e) => setAttributes(e.target.value)} rows={2}
                className="w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">{t.video.targetAudienceLabel}</label>
              <textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} rows={2}
                className="w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">{t.video.sellingPointsLabel}</label>
              <textarea value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} rows={2}
                className="w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
        </details>
      )}

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={!transcriptId || isGenerating}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-violet-500 disabled:opacity-50"
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {isGenerating ? t.video.generatingScript : t.video.generateScript}
      </button>

      {!transcriptId && (
        <p className="text-xs text-foreground-muted">{t.video.noTranscriptForScript}</p>
      )}

      {streamError && <p className="text-xs text-red-400">{streamError}</p>}

      {scripts.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-foreground-muted">
            {t.video.scriptVersionLabel}
          </label>
          <select
            value={savedScriptId ?? ""}
            onChange={(e) => handleSelectVersion(e.target.value)}
            className="rounded-lg border border-border/40 bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            {scripts.map((script) => (
              <option key={script.id} value={script.id}>
                {formatScriptVersionLabel(script.created_at)}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-foreground-subtle">
            {t.video.scriptVersionsCount.replace("{0}", String(scripts.length))}
          </span>
        </div>
      )}

      <textarea
        value={displayText}
        onChange={(e) => { if (!isGenerating) setEditedFinalText(e.target.value); setSaved(false); }}
        disabled={isGenerating}
        placeholder={t.video.scriptPlaceholder}
        className="h-48 w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40"
      />

      {savedScriptId && !isGenerating && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? t.video.savedScript : t.video.saveScript}
          </button>
        </div>
      )}
    </div>
  );
}
