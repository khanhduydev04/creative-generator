// Client Component: SSE script generation with streaming textarea + save action
"use client";

import { useState, useRef } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { usePatchScript } from "@/hooks/api/useScripts";
import type { BrandScript, CreateScriptRequest } from "@/features/video/types";

interface ProductOption {
  id: string;
  name: string;
}

interface ScriptEditorProps {
  transcriptId: string | null;
  brandId: string;
  products: ProductOption[];
  latestScript: BrandScript | null;
  onScriptCreated: (scriptId: string) => void;
}

const TONE_OPTIONS = ["humor", "authentic", "dramatic"] as const;
type Tone = (typeof TONE_OPTIONS)[number];

const SAVE_FEEDBACK_DURATION_MS = 2_000;
const SSE_SPLIT_SEPARATOR = "\n\n";
const SSE_EVENT_PREFIX = "event:";
const SSE_DATA_PREFIX = "data:";

export function ScriptEditor({
  transcriptId,
  brandId,
  products,
  latestScript,
  onScriptCreated,
}: ScriptEditorProps) {
  const { t } = useT();
  const patchScript = usePatchScript();
  const abortRef = useRef<AbortController | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("authentic");
  const [notes, setNotes] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [savedScriptId, setSavedScriptId] = useState<string | null>(latestScript?.id ?? null);
  const [editedFinalText, setEditedFinalText] = useState(latestScript?.final_text ?? "");
  const [saved, setSaved] = useState(false);

  const toneLabels: Record<Tone, string> = {
    humor: t.video.toneHumor,
    authentic: t.video.toneAuthentic,
    dramatic: t.video.toneDramatic,
  };

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
      promptConfig: { tone, notes },
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
            onChange={(e) => setSelectedProductId(e.target.value || null)}
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
