"use client";
// Client Component: collapsible section with content block renderer, needs onClick + state

import type { GuideContentBlock, GuideSection as GuideSectionType } from "@/features/guide/types";
import {
  Bookmark,
  Brain,
  Building2,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Film,
  FolderOpen,
  LayoutDashboard,
  Lightbulb,
  Lock,
  Mic,
  Music,
  Package,
  Palette,
  RefreshCw,
  Rocket,
  Settings,
  Shield,
  Sparkles,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { forwardRef, type ReactNode } from "react";

// ─── Icon Map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Rocket,
  LayoutDashboard,
  Palette,
  Lightbulb,
  Sparkles,
  EyeOff,
  FolderOpen,
  Bookmark,
  Settings,
  Shield,
  Lock,
  Wrench,
  Film,
  Workflow,
  Mic,
  Music,
  Building2,
  Package,
  Brain,
  RefreshCw,
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface GuideSectionProps {
  section: GuideSectionType;
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery?: string;
}

// ─── Search Highlight Helper ────────────────────────────────────────────────

function highlightText(text: string, query: string | undefined): ReactNode {
  if (!query || !query.trim()) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-200/60 rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

// ─── Content Block Renderer ─────────────────────────────────────────────────

function renderBlock(block: GuideContentBlock, idx: number, searchQuery?: string) {
  switch (block.type) {
    case "paragraph":
      return (
        <p key={idx} className="text-sm text-foreground-muted leading-relaxed">
          {highlightText(block.text, searchQuery)}
        </p>
      );

    case "heading":
      if (block.level === 3) {
        return (
          <h3 key={idx} id={block.id} className="text-sm font-bold text-foreground mt-4 mb-1">
            {highlightText(block.text, searchQuery)}
          </h3>
        );
      }
      return (
        <h4 key={idx} id={block.id} className="text-sm font-semibold text-foreground-muted mt-3 mb-1">
          {highlightText(block.text, searchQuery)}
        </h4>
      );

    case "steps":
      return (
        <ol key={idx} className="list-decimal list-inside space-y-1.5 text-sm text-foreground-muted ml-1">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {highlightText(item, searchQuery)}
            </li>
          ))}
        </ol>
      );

    case "list":
      if (block.ordered) {
        return (
          <ol key={idx} className="list-decimal list-inside space-y-1 text-sm text-foreground-muted ml-1">
            {block.items.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {highlightText(item, searchQuery)}
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul key={idx} className="list-disc list-inside space-y-1 text-sm text-foreground-muted ml-1">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {highlightText(item, searchQuery)}
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div key={idx} className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background-subtle">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-foreground-muted border-b border-border-subtle">
                    {highlightText(h, searchQuery)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border-subtle last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-foreground-muted">
                      {highlightText(cell, searchQuery)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "tip":
      return (
        <div key={idx} className="border-l-4 border-primary/40 bg-primary/5 px-4 py-3 rounded-r-lg text-sm text-foreground-muted leading-relaxed">
          {highlightText(block.text, searchQuery)}
        </div>
      );

    case "warning":
      return (
        <div key={idx} className="border-l-4 border-warning/40 bg-warning/[0.06] px-4 py-3 rounded-r-lg text-sm text-foreground-muted leading-relaxed">
          {highlightText(block.text, searchQuery)}
        </div>
      );

    default:
      return null;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export const GuideSection = forwardRef<HTMLElement, GuideSectionProps>(
  function GuideSection({ section, isExpanded, onToggle, searchQuery }, ref) {
    const IconComponent = ICON_MAP[section.icon];

    return (
      <section ref={ref} id={section.id} className="rounded-xl border border-border bg-background-elevated overflow-hidden">
        {/* Toggle Header */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-background-subtle/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-foreground-subtle shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-foreground-subtle shrink-0" />
            )}
            {IconComponent && (
              <IconComponent className="h-4.5 w-4.5 text-primary/70 shrink-0" />
            )}
            <div>
              <span className="text-sm font-bold text-foreground">
                {section.number}. {section.title}
              </span>
              {!isExpanded && (
                <p className="text-xs text-foreground-subtle mt-0.5">{section.description}</p>
              )}
            </div>
          </div>
          {section.adminOnly && (
            <span className="text-[10px] font-medium text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full shrink-0">
              Chỉ Admin
            </span>
          )}
        </button>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="px-5 pb-5 border-t border-border-subtle">
            {/* Section-level content */}
            {section.content.length > 0 && (
              <div className="pt-4 space-y-3">
                {section.content.map((block, i) => renderBlock(block, i, searchQuery))}
              </div>
            )}

            {/* Subsections */}
            {section.subsections.map((sub) => (
              <div key={sub.id} id={sub.id} className="mt-5">
                <h3 className="text-sm font-bold text-foreground mb-3 pb-2 border-b border-border-subtle">
                  {highlightText(sub.title, searchQuery)}
                </h3>
                <div className="space-y-3">
                  {sub.content.map((block, i) => renderBlock(block, i, searchQuery))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }
);
