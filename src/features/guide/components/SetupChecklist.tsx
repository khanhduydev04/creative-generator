"use client";
// Client Component: needs useState + useEffect for localStorage, onClick handlers

import { SETUP_CHECKLIST_ITEMS } from "@/features/guide/guide-data";
import { useT } from "@/lib/i18n/useTranslation";
import { ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Circle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ladospice-guide-checklist";

interface ChecklistStorage {
  completedIds: string[];
  dismissed: boolean;
}

function loadStorage(): ChecklistStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedIds: [], dismissed: false };
    return JSON.parse(raw) as ChecklistStorage;
  } catch {
    return { completedIds: [], dismissed: false };
  }
}

function saveStorage(data: ChecklistStorage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function SetupChecklist() {
  const { t } = useT();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = loadStorage();
    setCompletedIds(new Set(stored.completedIds));
    setDismissed(stored.dismissed);
    setMounted(true);
  }, []);

  function toggleItem(id: string) {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveStorage({ completedIds: Array.from(next), dismissed });
      return next;
    });
  }

  function toggleDismissed() {
    const next = !dismissed;
    setDismissed(next);
    saveStorage({ completedIds: Array.from(completedIds), dismissed: next });
  }

  if (!mounted) return null;

  const total = SETUP_CHECKLIST_ITEMS.length;
  const done = SETUP_CHECKLIST_ITEMS.filter((item) => completedIds.has(item.id)).length;
  const allComplete = done === total;
  const progressPct = Math.round((done / total) * 100);

  // Collapsed state
  if (dismissed) {
    return (
      <button
        type="button"
        onClick={toggleDismissed}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-background-elevated px-5 py-3 text-left hover:bg-background-subtle transition-colors"
      >
        <ChevronRight className="h-4 w-4 text-foreground-subtle shrink-0" />
        <span className="text-sm font-semibold text-foreground-muted">{t.guide.setupChecklist}</span>
        <span className="text-xs text-foreground-subtle tabular-nums">
          {done}/{total}
        </span>
        {allComplete && (
          <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />
        )}
        {!allComplete && (
          <div className="ml-auto h-1.5 w-16 rounded-full bg-background-elevated overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <button
          type="button"
          onClick={toggleDismissed}
          className="flex items-center gap-2 text-left"
        >
          <ChevronDown className="h-4 w-4 text-foreground-subtle" />
          <h3 className="text-sm font-bold text-foreground">{t.guide.firstTimeSetupChecklist}</h3>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground-subtle tabular-nums">{done}/{total}</span>
          <div className="h-1.5 w-20 rounded-full bg-background-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-5 py-3 space-y-1">
        {SETUP_CHECKLIST_ITEMS.map((item) => {
          const isChecked = completedIds.has(item.id);
          return (
            <div
              key={item.id}
              className={
                "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors " +
                (isChecked ? "opacity-60" : "")
              }
            >
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="shrink-0"
              >
                {isChecked ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-foreground-subtle hover:text-foreground-subtle transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <span className={
                  "text-sm " +
                  (isChecked ? "text-foreground-subtle line-through" : "text-foreground-muted font-medium")
                }>
                  {item.label}
                </span>
                {item.required && !isChecked && (
                  <span className="ml-2 text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                    {t.guide.required}
                  </span>
                )}
                <p className="text-xs text-foreground-subtle truncate">{item.description}</p>
              </div>
              <Link
                href={item.linkTo}
                className="p-1.5 text-foreground-subtle hover:text-primary hover:bg-primary/5 rounded-lg transition-colors shrink-0"
                title={t.guide.goTo.replace("{0}", item.label)}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* All complete message */}
      {allComplete && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-4 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-primary">
              {t.guide.allDone}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
