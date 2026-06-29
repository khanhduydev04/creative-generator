"use client";
// Client Component: controlled search input with clear button

import { Search, X } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";

interface GuideSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  resultCount: number | null;
}

export function GuideSearch({ query, onQueryChange, resultCount }: GuideSearchProps) {
  const { t } = useT();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={t.guide.searchPlaceholder}
        className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-border bg-background-elevated text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {resultCount !== null && (
          <span className="text-xs text-foreground-subtle tabular-nums">
            {resultCount} {resultCount === 1 ? t.guide.result : t.guide.results}
          </span>
        )}
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="p-0.5 text-foreground-subtle hover:text-foreground-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
