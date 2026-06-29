"use client";
// Client Component: full-screen modal for content adaptation workflow
// 3 steps: Upload/Input → Pair → Results

import type { ContentRow } from "@/lib/excel-parser";
import type { AdaptedContent } from "@/lib/content-adapter";
import type {
  AdaptationResult,
  ContentAdaptPanelProps,
} from "@/features/content-adapt/types";
import { ExcelUploadZone } from "@/features/content-adapt/components/ExcelUploadZone";
import { ContentPairingGrid } from "@/features/content-adapt/components/ContentPairingGrid";
import { AdaptationResults } from "@/features/content-adapt/components/AdaptationResults";
import { FileText, Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type Step = "input" | "pair" | "results";

export function ContentAdaptPanel({
  items,
  mode,
  productData,
  language,
  onClose,
}: ContentAdaptPanelProps) {
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<"excel" | "manual">("excel");
  const [excelRows, setExcelRows] = useState<ContentRow[]>([]);
  const [pairings, setPairings] = useState<Record<string, string>>({});
  const [results, setResults] = useState<AdaptationResult[]>([]);
  const [isAdapting, setIsAdapting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Count paired items
  const pairedCount = Object.values(pairings).filter(
    (v) => v.trim().length > 0,
  ).length;

  // ─── Handlers ────────────────────────────────────────────────────────────

  function handleExcelParsed(rows: ContentRow[]) {
    setExcelRows(rows);
    setStep("pair");
  }

  function handleClearExcel() {
    setExcelRows([]);
    setPairings({});
    setStep("input");
  }

  function handlePairingChange(identifier: string, content: string) {
    setPairings((prev) => ({ ...prev, [identifier]: content }));
  }

  function handleApplyToAll(content: string) {
    const updated: Record<string, string> = {};
    for (const item of items) {
      updated[item.identifier] = content;
    }
    setPairings(updated);
  }

  function handleGoToPair() {
    setStep("pair");
  }

  // ─── Generate adaptation via SSE ─────────────────────────────────────────

  const startAdaptation = useCallback(async () => {
    if (!productData) return;

    // Build items list from pairings
    const adaptItems = items
      .filter((item) => pairings[item.identifier]?.trim())
      .map((item) => ({
        adImageUrl: item.imageUrl,
        sampleContent: pairings[item.identifier].trim(),
        identifier: item.identifier,
        label: item.label,
      }));

    if (adaptItems.length === 0) return;

    // Initialize results
    const initialResults: AdaptationResult[] = adaptItems.map((item) => ({
      identifier: item.identifier,
      label: item.label,
      adImageUrl: item.adImageUrl,
      sampleContent: item.sampleContent,
      adaptedContent: null,
      status: "pending",
    }));

    setResults(initialResults);
    setStep("results");
    setIsAdapting(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/content-adapt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: adaptItems,
          productData,
          language,
          mode,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
              handleSSEEvent(eventType, data);
            } catch {
              // Skip malformed data
            }
            eventType = "";
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("[ContentAdaptPanel] SSE error:", err);
      }
    } finally {
      setIsAdapting(false);
      abortRef.current = null;
    }
  }, [items, pairings, productData, language, mode]);

  function handleSSEEvent(event: string, data: Record<string, unknown>) {
    if (event === "step") {
      const index = data.index as number;
      const status = data.status as string;
      setResults((prev) =>
        prev.map((r, i) => {
          if (i !== index) return r;
          if (status === "running")
            return { ...r, status: "adapting" as const };
          if (status === "failed")
            return {
              ...r,
              status: "failed" as const,
              error: (data.message as string) ?? "Failed",
            };
          return r;
        }),
      );
    }

    if (event === "result") {
      const index = data.index as number;
      const adapted = data.adaptedContent as AdaptedContent;
      setResults((prev) =>
        prev.map((r, i) =>
          i === index
            ? { ...r, status: "completed" as const, adaptedContent: adapted }
            : r,
        ),
      );
    }

    if (event === "error") {
      const index = data.index as number;
      setResults((prev) =>
        prev.map((r, i) =>
          i === index
            ? {
                ...r,
                status: "failed" as const,
                error: (data.error as string) ?? "Unknown error",
              }
            : r,
        ),
      );
    }
  }

  // ─── Regenerate a single item ────────────────────────────────────────────

  const handleRegenerate = useCallback(
    async (identifier: string) => {
      if (!productData) return;

      const item = items.find((i) => i.identifier === identifier);
      const sampleContent = pairings[identifier];
      if (!item || !sampleContent) return;

      // Mark as adapting
      setResults((prev) =>
        prev.map((r) =>
          r.identifier === identifier
            ? { ...r, status: "adapting" as const, error: undefined }
            : r,
        ),
      );

      try {
        const res = await fetch("/api/content-adapt/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [
              {
                adImageUrl: item.imageUrl,
                sampleContent,
                identifier: item.identifier,
                label: item.label,
              },
            ],
            productData,
            language,
            mode,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Server error: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6)) as Record<
                  string,
                  unknown
                >;
                if (eventType === "result") {
                  const adapted = data.adaptedContent as AdaptedContent;
                  setResults((prev) =>
                    prev.map((r) =>
                      r.identifier === identifier
                        ? {
                            ...r,
                            status: "completed" as const,
                            adaptedContent: adapted,
                          }
                        : r,
                    ),
                  );
                }
                if (eventType === "error") {
                  setResults((prev) =>
                    prev.map((r) =>
                      r.identifier === identifier
                        ? {
                            ...r,
                            status: "failed" as const,
                            error: (data.error as string) ?? "Failed",
                          }
                        : r,
                    ),
                  );
                }
              } catch {
                // Skip
              }
              eventType = "";
            }
          }
        }
      } catch (err) {
        setResults((prev) =>
          prev.map((r) =>
            r.identifier === identifier
              ? {
                  ...r,
                  status: "failed" as const,
                  error:
                    err instanceof Error ? err.message : "Regeneration failed",
                }
              : r,
          ),
        );
      }
    },
    [items, pairings, productData, language, mode],
  );

  // ─── Export ──────────────────────────────────────────────────────────────

  const handleExport = useCallback(
    async (format: "csv" | "json") => {
      const completed = results.filter(
        (r) => r.status === "completed" && r.adaptedContent,
      );
      if (completed.length === 0) return;

      setIsExporting(true);
      try {
        const res = await fetch("/api/content-adapt/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            results: completed.map((r) => ({
              label: r.label,
              caption: r.adaptedContent!.caption,
              hashtags: r.adaptedContent!.hashtags,
              callToAction: r.adaptedContent!.callToAction,
            })),
            format,
          }),
        });

        if (!res.ok) throw new Error("Export failed");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          format === "csv" ? "adapted-content.csv" : "adapted-content.json";
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("[ContentAdaptPanel] Export error:", err);
      } finally {
        setIsExporting(false);
      }
    },
    [results],
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-sm !m-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-400" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Content Adaptation
            </h2>
            <p className="text-xs text-zinc-400">
              {mode === "vision"
                ? "Claude analyzes ad image + rewrites content"
                : "Claude rewrites content with your product data"}
              {" · "}
              {items.length} ad{items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Step indicators */}
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <span
              className={
                step === "input" ? "text-blue-400 font-medium" : ""
              }
            >
              Upload
            </span>
            <span>→</span>
            <span
              className={step === "pair" ? "text-blue-400 font-medium" : ""}
            >
              Pair
            </span>
            <span>→</span>
            <span
              className={
                step === "results" ? "text-blue-400 font-medium" : ""
              }
            >
              Results
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (abortRef.current) abortRef.current.abort();
              onClose();
            }}
            className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-4xl">
          {/* Step 1: Input */}
          {step === "input" && (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode("excel")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    inputMode === "excel"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Upload Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("manual");
                    setStep("pair");
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    inputMode === "manual"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Manual Input
                </button>
              </div>

              {inputMode === "excel" && (
                <ExcelUploadZone
                  onParsed={handleExcelParsed}
                  parsedRows={excelRows}
                  onClear={handleClearExcel}
                />
              )}
            </div>
          )}

          {/* Step 2: Pair */}
          {step === "pair" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-300">
                  Match each ad with sample content
                  {excelRows.length > 0 &&
                    ` (${excelRows.length} Excel rows available)`}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">
                    {pairedCount}/{items.length} paired
                  </span>
                  <button
                    type="button"
                    onClick={() => void startAdaptation()}
                    disabled={pairedCount === 0 || isAdapting || !productData}
                    className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAdapting ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Adapting...
                      </>
                    ) : (
                      <>
                        <FileText className="h-3 w-3" />
                        Adapt Content ({pairedCount})
                      </>
                    )}
                  </button>
                </div>
              </div>

              <ContentPairingGrid
                items={items}
                excelRows={excelRows}
                pairings={pairings}
                onPairingChange={handlePairingChange}
                onApplyToAll={handleApplyToAll}
              />
            </div>
          )}

          {/* Step 3: Results */}
          {step === "results" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-300">Adaptation Results</p>
                <button
                  type="button"
                  onClick={handleGoToPair}
                  disabled={isAdapting}
                  className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition-colors"
                >
                  ← Back to pairing
                </button>
              </div>

              <AdaptationResults
                results={results}
                onRegenerate={handleRegenerate}
                onExport={handleExport}
                isExporting={isExporting}
              />
            </div>
          )}

          {/* No product data warning */}
          {!productData && (
            <div className="mt-4 rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-3">
              <p className="text-xs text-yellow-400">
                Product data is not available. Generate ads first so product
                information is loaded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
