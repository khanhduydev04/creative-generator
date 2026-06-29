"use client";
// Client Component: multi-select target audience with checkbox list and selected chips

import type { Persona } from "@/features/brand/types";
import { useT } from "@/lib/i18n/useTranslation";
import { Users, X } from "lucide-react";

interface TargetAudienceSectionProps {
  personas: Persona[];
  selectedPersonaIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function TargetAudienceSection({
  personas,
  selectedPersonaIds,
  onSelectionChange,
}: TargetAudienceSectionProps) {
  const { t } = useT();
  const allSelected = selectedPersonaIds.length === personas.length && personas.length > 0;

  function handleToggleAll() {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(personas.map((p) => p.id));
    }
  }

  function handleToggle(id: string) {
    if (selectedPersonaIds.includes(id)) {
      onSelectionChange(selectedPersonaIds.filter((pid) => pid !== id));
    } else {
      onSelectionChange([...selectedPersonaIds, id]);
    }
  }

  function handleRemove(id: string) {
    onSelectionChange(selectedPersonaIds.filter((pid) => pid !== id));
  }

  const selectedPersonas = personas.filter((p) => selectedPersonaIds.includes(p.id));

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-border-strong/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-3.5 w-3.5 text-primary" />
        </div>
        {t.workspace.targetAudience}
        {selectedPersonaIds.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {selectedPersonaIds.length} {t.workspace.selected}
          </span>
        )}
      </h3>

      {/* All profiles toggle */}
      <label className="flex items-center gap-3 p-2.5 rounded-lg bg-background-subtle border border-border-subtle cursor-pointer hover:bg-background-elevated transition-colors mb-3">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={handleToggleAll}
          className="accent-primary w-4 h-4 rounded"
        />
        <span className="text-sm font-semibold text-foreground-muted">{t.workspace.allProfiles}</span>
        <span className="text-[10px] text-foreground-subtle ml-auto">{personas.length} {t.workspace.total}</span>
      </label>

      {/* Persona list with checkboxes */}
      {personas.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
          {personas.map((persona) => {
            const isSelected = selectedPersonaIds.includes(persona.id);
            return (
              <label
                key={persona.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary/5 border border-primary/20"
                    : "hover:bg-background-subtle border border-transparent"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(persona.id)}
                  className="accent-primary w-4 h-4 rounded mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{persona.title}</p>
                  {persona.pain && (
                    <p className="text-[10px] text-foreground-subtle truncate mt-0.5">{persona.pain}</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {personas.length === 0 && (
        <p className="text-xs text-foreground-subtle text-center py-4">
          {t.workspace.noPersonas}
        </p>
      )}

      {/* Selected personas chips */}
      {selectedPersonas.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <p className="text-[10px] font-bold text-foreground-subtle uppercase tracking-wider mb-2">{t.workspace.selected}</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedPersonas.map((persona) => (
              <span
                key={persona.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold"
              >
                {persona.title}
                <button
                  type="button"
                  onClick={() => handleRemove(persona.id)}
                  className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                  aria-label={`Remove ${persona.title}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
