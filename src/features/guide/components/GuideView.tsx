"use client";
// Client Component: needs useState, useMemo, useRef, useEffect for search/expand/scroll + useAuth for role filtering

import { GUIDE_SECTIONS } from "@/features/guide/guide-data";
import { APP_VERSION } from "@/lib/version";
import type { GuideContentBlock, GuideSearchResult, GuideSection as GuideSectionType } from "@/features/guide/types";
import { useAuth } from "@/features/auth/context";
import { isAdmin } from "@/features/auth/types";
import { GuideSearch } from "@/features/guide/components/GuideSearch";
import { GuideSection } from "@/features/guide/components/GuideSection";
import { GuideTableOfContents } from "@/features/guide/components/GuideTableOfContents";
import { SetupChecklist } from "@/features/guide/components/SetupChecklist";
import { BookOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractBlockText(block: GuideContentBlock): string {
  switch (block.type) {
    case "paragraph":
    case "tip":
    case "warning":
      return block.text;
    case "heading":
      return block.text;
    case "steps":
    case "list":
      return block.items.join(" ");
    case "table":
      return [...block.headers, ...block.rows.flat()].join(" ");
    default:
      return "";
  }
}

function searchGuide(
  sections: GuideSectionType[],
  query: string
): GuideSearchResult[] {
  const lower = query.toLowerCase();
  const results: GuideSearchResult[] = [];

  for (const section of sections) {
    // Section title
    if (section.title.toLowerCase().includes(lower)) {
      results.push({
        sectionId: section.id,
        sectionTitle: section.title,
        matchedText: section.title,
      });
    }

    // Section-level content
    for (const block of section.content) {
      const text = extractBlockText(block);
      if (text.toLowerCase().includes(lower)) {
        results.push({
          sectionId: section.id,
          sectionTitle: section.title,
          matchedText: text.slice(0, 120),
        });
      }
    }

    // Subsections
    for (const sub of section.subsections) {
      // Subsection title
      if (sub.title.toLowerCase().includes(lower)) {
        results.push({
          sectionId: section.id,
          sectionTitle: section.title,
          subsectionId: sub.id,
          subsectionTitle: sub.title,
          matchedText: sub.title,
        });
      }

      for (const block of sub.content) {
        const text = extractBlockText(block);
        if (text.toLowerCase().includes(lower)) {
          results.push({
            sectionId: section.id,
            sectionTitle: section.title,
            subsectionId: sub.id,
            subsectionTitle: sub.title,
            matchedText: text.slice(0, 120),
          });
        }
      }
    }
  }

  return results;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GuideView() {
  const { profile } = useAuth();
  const userIsAdmin = profile ? isAdmin(profile.role) : false;

  const visibleSections = useMemo(
    () => GUIDE_SECTIONS.filter((s) => !s.adminOnly || userIsAdmin),
    [userIsAdmin]
  );

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(visibleSections.map((s) => s.id))
  );
  const [activeSection, setActiveSection] = useState(
    visibleSections[0]?.id ?? ""
  );

  // Refs for IntersectionObserver
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchGuide(visibleSections, searchQuery.trim());
  }, [searchQuery, visibleSections]);

  const searchMatchSectionIds = useMemo(() => {
    if (!searchResults) return undefined;
    return new Set(searchResults.map((r) => r.sectionId));
  }, [searchResults]);

  // When search is active, auto-expand only matched sections
  useEffect(() => {
    if (searchMatchSectionIds) {
      setExpandedSections(new Set(searchMatchSectionIds));
    }
  }, [searchMatchSectionIds]);

  // When search is cleared, expand all again
  useEffect(() => {
    if (!searchQuery.trim()) {
      setExpandedSections(new Set(visibleSections.map((s) => s.id)));
    }
  }, [searchQuery, visibleSections]);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );

    for (const el of sectionRefs.current.values()) {
      observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [visibleSections]);

  const setSectionRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(id, el);
      else sectionRefs.current.delete(id);
    },
    []
  );

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Ensure it's expanded
      setExpandedSections((prev) => {
        if (prev.has(sectionId)) return prev;
        return new Set([...prev, sectionId]);
      });
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">User Guide</h1>
            <span className="text-[10px] font-mono text-foreground-subtle bg-background-elevated px-2 py-0.5 rounded-full">
              v{APP_VERSION}
            </span>
          </div>
          <p className="text-foreground-muted text-sm mt-1">
            Everything you need to know about using Ladospice.
          </p>
        </div>
        <div className="w-72 shrink-0 hidden sm:block">
          <GuideSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
            resultCount={searchResults ? searchResults.length : null}
          />
        </div>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden mb-4">
        <GuideSearch
          query={searchQuery}
          onQueryChange={setSearchQuery}
          resultCount={searchResults ? searchResults.length : null}
        />
      </div>

      {/* Setup Checklist */}
      <div className="mb-6">
        <SetupChecklist />
      </div>

      {/* Mobile section selector */}
      <div className="lg:hidden mb-4">
        <select
          value={activeSection}
          onChange={(e) => scrollToSection(e.target.value)}
          className="w-full rounded-xl border border-border bg-background-elevated px-4 py-2.5 text-sm text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        >
          {visibleSections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}. {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* 2-Column Layout */}
      <div className="flex gap-8">
        {/* Sidebar TOC — desktop only */}
        <aside className="hidden lg:block w-[260px] shrink-0">
          <GuideTableOfContents
            sections={visibleSections}
            activeSection={activeSection}
            onSectionClick={scrollToSection}
            searchMatchIds={searchMatchSectionIds}
          />
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-4 pb-16">
          {visibleSections.map((section) => (
            <GuideSection
              key={section.id}
              ref={setSectionRef(section.id)}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              searchQuery={searchQuery.trim() || undefined}
            />
          ))}
        </main>
      </div>
    </div>
  );
}
