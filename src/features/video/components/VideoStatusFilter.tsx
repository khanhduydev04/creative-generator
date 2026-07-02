// Client Component: status tab filter + search input + sort/source dropdowns
"use client";

import { useT } from "@/lib/i18n/useTranslation";
import { Search } from "lucide-react";
import type { VideoStatus, VideoSort, VideoSource } from "@/features/video/types";

interface VideoStatusFilterProps {
  activeStatus: VideoStatus;
  onStatusChange: (status: VideoStatus) => void;
  search: string;
  onSearchChange: (value: string) => void;
  activeTotal: number;
  sort: VideoSort;
  onSortChange: (sort: VideoSort) => void;
  source: VideoSource;
  onSourceChange: (source: VideoSource) => void;
}

export function VideoStatusFilter({
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
  activeTotal,
  sort,
  onSortChange,
  source,
  onSourceChange,
}: VideoStatusFilterProps) {
  const { t } = useT();

  const tabs: { key: VideoStatus; label: string }[] = [
    { key: "pending", label: t.video.filterPending },
    { key: "winner", label: t.video.filterWinner },
    { key: "rejected", label: t.video.filterRejected },
  ];

  const selectClassName =
    "rounded-lg border border-border/40 bg-background-elevated/30 py-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onStatusChange(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeStatus === tab.key
                ? "bg-primary/10 text-primary"
                : "text-foreground-muted hover:bg-black/[0.04] hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeStatus === tab.key && activeTotal > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                {activeTotal}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.video.searchPlaceholder}
            className="w-full rounded-lg border border-border/40 bg-background-elevated/30 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={sort}
          // Safe: the option values below are hardcoded literals matching the VideoSort
          // union exactly, so e.target.value can only ever be "recent" or "views".
          onChange={(e) => onSortChange(e.target.value as VideoSort)}
          className={selectClassName}
        >
          <option value="recent">{t.video.sortRecent}</option>
          <option value="views">{t.video.sortViews}</option>
        </select>
        <select
          value={source}
          // Safe: the option values below are hardcoded literals matching the VideoSource
          // union exactly, so e.target.value can only ever be "all", "apify", or "manual".
          onChange={(e) => onSourceChange(e.target.value as VideoSource)}
          className={selectClassName}
        >
          <option value="all">{t.video.sourceAll}</option>
          <option value="apify">{t.video.sourceApify}</option>
          <option value="manual">{t.video.sourceManual}</option>
        </select>
      </div>
    </div>
  );
}
