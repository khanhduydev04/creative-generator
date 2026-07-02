// Client Component: page buttons need click handlers
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPaginationRange, PAGINATION_ELLIPSIS } from "@/lib/utils/pagination-range";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = getPaginationRange(currentPage, totalPages);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-foreground-muted transition-colors hover:bg-black/[0.04] disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {items.map((item, i) =>
        item === PAGINATION_ELLIPSIS ? (
          <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-sm text-foreground-subtle">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors ${
              item === currentPage
                ? "bg-primary text-primary-foreground"
                : "text-foreground-muted hover:bg-black/[0.04]"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-foreground-muted transition-colors hover:bg-black/[0.04] disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
