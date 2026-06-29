"use client";
// Client Component: needs onClick handlers for section navigation

import type { GuideSection } from "@/features/guide/types";

interface GuideTableOfContentsProps {
  sections: GuideSection[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  searchMatchIds?: Set<string>;
}

export function GuideTableOfContents({
  sections,
  activeSection,
  onSectionClick,
  searchMatchIds,
}: GuideTableOfContentsProps) {
  return (
    <nav className="sticky top-24 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle mb-3 px-3">
        Contents
      </p>
      {sections.map((section) => {
        const isActive = activeSection === section.id;
        const hasMatch = searchMatchIds?.has(section.id);

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionClick(section.id)}
            className={
              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 " +
              (isActive
                ? "font-semibold text-primary bg-primary/5"
                : "text-foreground-muted hover:text-foreground hover:bg-background-subtle")
            }
          >
            <span className="tabular-nums text-xs text-foreground-subtle w-5 shrink-0">
              {section.number}.
            </span>
            <span className="truncate">{section.title}</span>
            {hasMatch && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
