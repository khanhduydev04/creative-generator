"use client";
// Client Component: displays adapted content results with copy, edit, and export functionality

import type { AdaptationResult } from "@/features/content-adapt/types";
import {
  CheckCircle2,
  Copy,
  Download,
  ImageIcon,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";

interface AdaptationResultsProps {
  results: AdaptationResult[];
  onRegenerate: (identifier: string) => void;
  onExport: (format: "csv" | "json") => void;
  isExporting: boolean;
}

export function AdaptationResults({
  results,
  onRegenerate,
  onExport,
  isExporting,
}: AdaptationResultsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const completed = results.filter((r) => r.status === "completed");
  const failed = results.filter((r) => r.status === "failed");
  const adapting = results.filter((r) => r.status === "adapting");

  const handleCopy = useCallback(
    (identifier: string, text: string) => {
      void navigator.clipboard.writeText(text);
      setCopiedId(identifier);
      setTimeout(() => setCopiedId(null), 2000);
    },
    [],
  );

  function formatFullContent(result: AdaptationResult): string {
    if (!result.adaptedContent) return "";
    const parts = [result.adaptedContent.caption];
    if (result.adaptedContent.hashtags.length > 0) {
      parts.push(
        "\n\n" + result.adaptedContent.hashtags.map((h) => `#${h}`).join(" "),
      );
    }
    if (result.adaptedContent.callToAction) {
      parts.push("\n\n" + result.adaptedContent.callToAction);
    }
    return parts.join("");
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          {completed.length > 0 && (
            <span className="text-green-400">
              {completed.length} completed
            </span>
          )}
          {adapting.length > 0 && (
            <span className="text-blue-400">{adapting.length} adapting...</span>
          )}
          {failed.length > 0 && (
            <span className="text-red-400">{failed.length} failed</span>
          )}
        </div>

        {/* Export buttons */}
        {completed.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onExport("csv")}
              disabled={isExporting}
              className="flex items-center gap-1 rounded-md bg-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => onExport("json")}
              disabled={isExporting}
              className="flex items-center gap-1 rounded-md bg-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
            >
              <Download className="h-3 w-3" />
              JSON
            </button>
          </div>
        )}
      </div>

      {/* Result cards */}
      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.identifier}
            className="rounded-lg border border-zinc-700 bg-zinc-900/50 overflow-hidden"
          >
            <div className="flex gap-0">
              {/* Left: ad thumbnail */}
              <div className="w-24 h-24 flex-shrink-0 bg-zinc-800">
                {result.adImageUrl ? (
                  <img
                    src={result.adImageUrl}
                    alt={result.label}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-zinc-600" />
                  </div>
                )}
              </div>

              {/* Right: content */}
              <div className="flex-1 min-w-0 p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">
                      {result.label}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {result.identifier}
                    </p>
                  </div>

                  {/* Status icon */}
                  {result.status === "completed" && (
                    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                  )}
                  {result.status === "adapting" && (
                    <Loader2 className="h-4 w-4 text-blue-400 animate-spin flex-shrink-0" />
                  )}
                  {result.status === "failed" && (
                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  )}
                </div>

                {/* Adapted content */}
                {result.status === "completed" && result.adaptedContent && (
                  <div className="space-y-2">
                    {/* Caption */}
                    <div className="rounded-md bg-zinc-800/50 p-2">
                      <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {result.adaptedContent.caption}
                      </p>
                    </div>

                    {/* Hashtags */}
                    {result.adaptedContent.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.adaptedContent.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[10px] text-blue-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* CTA */}
                    {result.adaptedContent.callToAction && (
                      <p className="text-[10px] text-zinc-400 italic">
                        CTA: {result.adaptedContent.callToAction}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            result.identifier,
                            formatFullContent(result),
                          )
                        }
                        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedId === result.identifier ? "Copied!" : "Copy All"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRegenerate(result.identifier)}
                        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Regenerate
                      </button>
                    </div>
                  </div>
                )}

                {/* Adapting state */}
                {result.status === "adapting" && (
                  <p className="text-xs text-zinc-400">
                    Analyzing and adapting content...
                  </p>
                )}

                {/* Error state */}
                {result.status === "failed" && (
                  <div className="space-y-1">
                    <p className="text-xs text-red-400">{result.error}</p>
                    <button
                      type="button"
                      onClick={() => onRegenerate(result.identifier)}
                      className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                  </div>
                )}

                {/* Pending state */}
                {result.status === "pending" && (
                  <p className="text-xs text-zinc-500">Waiting...</p>
                )}
              </div>
            </div>

            {/* Sample content comparison (collapsed by default for completed) */}
            {result.status === "completed" && (
              <details className="border-t border-zinc-800">
                <summary className="px-3 py-1.5 text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-400">
                  Show original sample content
                </summary>
                <div className="px-3 pb-2">
                  <p className="text-[10px] text-zinc-500 whitespace-pre-wrap">
                    {result.sampleContent}
                  </p>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
