"use client";
// Client Component: collapsible form with controlled inputs requiring useState

import { useT } from "@/lib/i18n/useTranslation";
import { ChevronDown, ChevronRight, Type, X } from "lucide-react";
import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdCopyOverride {
  headline: string;
  bodyText: string;
  additionalNotes: string;
}

interface AdCopySectionProps {
  adCopy: AdCopyOverride;
  onAdCopyChange: (adCopy: AdCopyOverride) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdCopySection({ adCopy, onAdCopyChange }: AdCopySectionProps) {
  const { t } = useT();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasContent =
    adCopy.headline.trim() !== "" ||
    adCopy.bodyText.trim() !== "" ||
    adCopy.additionalNotes.trim() !== "";

  function handleClearAll() {
    onAdCopyChange({ headline: "", bodyText: "", additionalNotes: "" });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 backdrop-blur-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      {/* Toggle Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-background-subtle transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-foreground-subtle" />
          ) : (
            <ChevronRight className="h-4 w-4 text-foreground-subtle" />
          )}
          <Type className="h-4 w-4 text-foreground-muted" />
          <span className="text-sm font-semibold text-foreground-muted">
            {t.workspace.adCopy}
          </span>
          {hasContent && !isExpanded && (
            <span className="ml-1 h-2 w-2 rounded-full bg-primary inline-block" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-subtle">
          {/* Headline */}
          <div className="pt-3">
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              {t.workspace.headline}
            </label>
            <input
              type="text"
              value={adCopy.headline}
              onChange={(e) =>
                onAdCopyChange({ ...adCopy, headline: e.target.value })
              }
              placeholder='e.g., "73% saw results in just 14 days"'
              className="w-full rounded-lg border border-border bg-background-subtle px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Body Text */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              {t.workspace.bodyText}
            </label>
            <input
              type="text"
              value={adCopy.bodyText}
              onChange={(e) =>
                onAdCopyChange({ ...adCopy, bodyText: e.target.value })
              }
              placeholder='e.g., "Clinically proven formula"'
              className="w-full rounded-lg border border-border bg-background-subtle px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              {t.workspace.additionalNotes}
            </label>
            <textarea
              value={adCopy.additionalNotes}
              onChange={(e) =>
                onAdCopyChange({ ...adCopy, additionalNotes: e.target.value })
              }
              placeholder="e.g., Target women 35-50, use urgency angle"
              rows={3}
              className="w-full rounded-lg border border-border bg-background-subtle px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* Clear All */}
          {hasContent && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 text-xs text-foreground-subtle hover:text-red-500 transition-colors"
            >
              <X className="h-3 w-3" />
              {t.workspace.clearAll}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
