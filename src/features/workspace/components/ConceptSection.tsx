"use client";
// Client Component: concept multi-select with checkboxes and description display

import type { Concept } from "@/lib/concepts";
import { useT } from "@/lib/i18n/useTranslation";
import { Check, Lightbulb } from "lucide-react";

interface ConceptSectionProps {
  concepts: Concept[];
  selectedConceptIds: string[];
  onConceptsChange: (ids: string[]) => void;
}

export function ConceptSection({
  concepts,
  selectedConceptIds,
  onConceptsChange,
}: ConceptSectionProps) {
  const { t } = useT();

  function toggleConcept(id: string) {
    if (selectedConceptIds.includes(id)) {
      onConceptsChange(selectedConceptIds.filter((c) => c !== id));
    } else {
      onConceptsChange([...selectedConceptIds, id]);
    }
  }

  const hasCompetitorRequired = concepts.some(
    (c) => selectedConceptIds.includes(c.id) && c.requiresCompetitor,
  );

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-border-strong/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
          </div>
          {t.workspace.concepts} <span className="text-rose-500">*</span>
        </h3>
        {selectedConceptIds.length > 0 && (
          <span className="text-[10px] font-mono text-foreground-subtle">
            {selectedConceptIds.length} {t.workspace.selected}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {concepts.map((c) => {
          const isSelected = selectedConceptIds.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleConcept(c.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border-subtle bg-background-subtle hover:border-border"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-border-strong bg-background-elevated"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-foreground-muted"}`}>
                      {c.label}
                    </span>
                    {c.requiresCompetitor && (
                      <span className="text-[9px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                        {t.workspace.competitor}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-foreground-subtle mt-0.5 line-clamp-2">
                    {c.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {concepts.length === 0 && (
        <p className="text-xs text-foreground-subtle text-center py-4">
          {t.workspace.noConceptsAvailable}
        </p>
      )}

      {hasCompetitorRequired && (
        <p className="text-[10px] text-amber-600 font-semibold mt-3 px-1">
          {t.workspace.conceptsRequireCompetitor}
        </p>
      )}
    </div>
  );
}
