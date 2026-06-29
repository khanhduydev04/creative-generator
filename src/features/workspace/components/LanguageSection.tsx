"use client";
// Client Component: language selector dropdown — requires onChange handler

import { useT } from "@/lib/i18n/useTranslation";
import { Languages } from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-UK", label: "English (UK)" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "vi", label: "Vietnamese" },
] as const;

// ─── Props ──────────────────────────────────────────────────────────────────

interface LanguageSectionProps {
  language: string;
  onLanguageChange: (language: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LanguageSection({ language, onLanguageChange }: LanguageSectionProps) {
  const { t } = useT();

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-border-strong/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <label className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Languages className="h-3.5 w-3.5 text-primary" />
        </div>
        {t.workspace.language}
      </label>
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background-subtle text-foreground px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-foreground-subtle mt-1.5">
        {t.workspace.languageHelper}
      </p>
    </div>
  );
}
