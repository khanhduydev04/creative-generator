// Client Component: status tab filter + search input
"use client";

import { useT } from "@/lib/i18n/useTranslation";
import { Search } from "lucide-react";
import type { VideoStatus } from "@/features/video/types";

type FilterStatus = VideoStatus | "all";

interface VideoStatusFilterProps {
  activeStatus: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
  search: string;
  onSearchChange: (value: string) => void;
  counts: Record<FilterStatus, number>;
}

export function VideoStatusFilter({
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
  counts,
}: VideoStatusFilterProps) {
  const { t } = useT();

  const tabs: { key: FilterStatus; label: string }[] = [
    { key: "all", label: t.video.filterAll },
    { key: "pending", label: t.video.filterPending },
    { key: "winner", label: t.video.filterWinner },
    { key: "rejected", label: t.video.filterRejected },
  ];

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
            {counts[tab.key] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  activeStatus === tab.key
                    ? "bg-primary/20 text-primary"
                    : "bg-background-elevated text-foreground-subtle"
                }`}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.video.searchPlaceholder}
          className="w-full rounded-lg border border-border/40 bg-background-elevated/30 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}
