"use client";
// Client Component: grid for pairing generated ads with sample content (from Excel or manual input)

import type { ContentRow } from "@/lib/excel-parser";
import { ImageIcon } from "lucide-react";
import { useState } from "react";

interface PairingItem {
  imageUrl: string;
  identifier: string;
  label: string;
}

interface ContentPairingGridProps {
  items: PairingItem[];
  excelRows: ContentRow[];
  /** Current pairings: identifier → sampleContent */
  pairings: Record<string, string>;
  onPairingChange: (identifier: string, content: string) => void;
  /** Apply a single content to all items */
  onApplyToAll: (content: string) => void;
}

export function ContentPairingGrid({
  items,
  excelRows,
  pairings,
  onPairingChange,
  onApplyToAll,
}: ContentPairingGridProps) {
  const [applyAllText, setApplyAllText] = useState("");
  // Track selected excel row index per item to avoid duplicate-content confusion
  const [selectedIndices, setSelectedIndices] = useState<
    Record<string, number>
  >({});
  const [applyAllIndex, setApplyAllIndex] = useState<number>(-1);
  const hasExcel = excelRows.length > 0;

  // Simple fuzzy match: check if any word from the image name appears in the label
  function suggestMatch(label: string): ContentRow | null {
    if (!hasExcel) return null;
    const labelWords = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    let bestMatch: ContentRow | null = null;
    let bestScore = 0;

    for (const row of excelRows) {
      const nameWords = row.imageName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/[\s_\-.]+/)
        .filter((w) => w.length > 2);

      const score = labelWords.filter((w) =>
        nameWords.some((nw) => nw.includes(w) || w.includes(nw)),
      ).length;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = row;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  }

  return (
    <div className="space-y-4">
      {/* Apply to all shortcut */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
        <p className="text-xs text-zinc-400 mb-2">
          Apply same content to all ads:
        </p>
        <div className="flex gap-2">
          {hasExcel ? (
            <select
              value={applyAllIndex.toString()}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                setApplyAllIndex(idx);
                setApplyAllText(idx >= 0 ? excelRows[idx].content : "");
              }}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200"
            >
              <option value="-1">Select from Excel...</option>
              {excelRows.map((row, i) => (
                <option key={i} value={i.toString()}>
                  {i + 1}: {row.imageName}: {row.content.slice(0, 60)}...
                </option>
              ))}
            </select>
          ) : (
            <textarea
              value={applyAllText}
              onChange={(e) => setApplyAllText(e.target.value)}
              placeholder="Enter sample content to apply to all..."
              rows={2}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 resize-none"
            />
          )}
          <button
            type="button"
            onClick={() => {
              if (applyAllText.trim()) onApplyToAll(applyAllText.trim());
            }}
            disabled={!applyAllText.trim()}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply All
          </button>
        </div>
      </div>

      {/* Per-item pairing grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((item) => {
          const currentContent = pairings[item.identifier] ?? "";
          const suggestion = suggestMatch(item.label);

          return (
            <div
              key={item.identifier}
              className="rounded-lg border border-zinc-700 bg-zinc-900/50 overflow-hidden"
            >
              {/* Thumbnail + label */}
              <div className="flex items-center gap-2 p-2 border-b border-zinc-800">
                <div className="h-12 w-12 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-zinc-600" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-200 truncate">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-zinc-500">{item.identifier}</p>
                </div>
              </div>

              {/* Content pairing */}
              <div className="p-2 space-y-2">
                {hasExcel ? (
                  <>
                    <select
                      value={
                        selectedIndices[item.identifier]?.toString() ?? ""
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setSelectedIndices((prev) => {
                            const next = { ...prev };
                            delete next[item.identifier];
                            return next;
                          });
                          onPairingChange(item.identifier, "");
                        } else {
                          const idx = parseInt(val, 10);
                          setSelectedIndices((prev) => ({
                            ...prev,
                            [item.identifier]: idx,
                          }));
                          onPairingChange(
                            item.identifier,
                            excelRows[idx].content,
                          );
                        }
                      }}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200"
                    >
                      <option value="">Select content...</option>
                      {excelRows.map((row, i) => (
                        <option key={i} value={i.toString()}>
                          {i + 1}: {row.content.slice(0, 50)}...
                        </option>
                      ))}
                    </select>
                    {/* Show fuzzy suggestion if no content selected */}
                    {!currentContent && suggestion && (
                      <button
                        type="button"
                        onClick={() =>
                          onPairingChange(item.identifier, suggestion.content)
                        }
                        className="w-full text-left rounded-md border border-dashed border-blue-600/40 bg-blue-600/5 px-2 py-1.5 text-[10px] text-blue-400 hover:bg-blue-600/10 transition-colors"
                      >
                        Suggested: {suggestion.imageName} →{" "}
                        {suggestion.content.slice(0, 40)}...
                      </button>
                    )}
                  </>
                ) : (
                  <textarea
                    value={currentContent}
                    onChange={(e) =>
                      onPairingChange(item.identifier, e.target.value)
                    }
                    placeholder="Enter sample content..."
                    rows={3}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 resize-none"
                  />
                )}

                {/* Status indicator */}
                <div className="flex justify-end">
                  {currentContent ? (
                    <span className="text-[10px] text-green-400">Paired</span>
                  ) : (
                    <span className="text-[10px] text-zinc-500">
                      No content
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
