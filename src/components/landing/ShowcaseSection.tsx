// Client Component: requires i18n context for language switching
"use client";

import { useT } from "@/lib/i18n/useTranslation";
import { useState } from "react";
import { Sparkles, EyeOff, Languages, ArrowRight } from "lucide-react";

const CONCEPT_GRADIENTS = [
  "from-rose-500 via-pink-600 to-purple-700",
  "from-sky-500 via-blue-600 to-indigo-800",
  "from-amber-500 via-orange-600 to-red-700",
  "from-emerald-500 via-teal-600 to-cyan-800",
] as const;

const CONCEPT_BRANDS = ["LUXE BEAUTY", "TECHWAVE", "GOLDEN WOK", "FITZONE"] as const;

const STEALTH_GRADIENTS = [
  "from-violet-500 via-purple-600 to-indigo-800",
  "from-pink-500 via-rose-600 to-red-700",
  "from-teal-500 via-emerald-600 to-green-800",
] as const;

const STEALTH_BRANDS = ["POWERBOOST", "GLOW LAB", "DREAMWELL"] as const;

type Tab = "concept" | "stealth" | "content";

export function ShowcaseSection() {
  const { t } = useT();
  const [activeTab, setActiveTab] = useState<Tab>("concept");

  const TABS: { id: Tab; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "concept", label: t.showcase.tab1, desc: t.showcase.tab1Desc, icon: Sparkles },
    { id: "stealth", label: t.showcase.tab2, desc: t.showcase.tab2Desc, icon: EyeOff },
    { id: "content", label: t.showcase.tab3, desc: t.showcase.tab3Desc, icon: Languages },
  ];

  const conceptMockups = [
    { headline: t.showcase.mockup1Headline, sub: t.showcase.mockup1Sub, cta: t.showcase.mockup1Cta },
    { headline: t.showcase.mockup2Headline, sub: t.showcase.mockup2Sub, cta: t.showcase.mockup2Cta },
    { headline: t.showcase.mockup3Headline, sub: t.showcase.mockup3Sub, cta: t.showcase.mockup3Cta },
    { headline: t.showcase.mockup4Headline, sub: t.showcase.mockup4Sub, cta: t.showcase.mockup4Cta },
  ];

  const stealthMockups = [
    { headline: t.showcase.stealth1Headline, sub: t.showcase.stealth1Sub, cta: t.showcase.stealth1Cta },
    { headline: t.showcase.stealth2Headline, sub: t.showcase.stealth2Sub, cta: t.showcase.stealth2Cta },
    { headline: t.showcase.stealth3Headline, sub: t.showcase.stealth3Sub, cta: t.showcase.stealth3Cta },
  ];

  const adaptExamples = [
    { ref: t.showcase.adaptRef1, result: t.showcase.adaptResult1 },
    { ref: t.showcase.adaptRef2, result: t.showcase.adaptResult2 },
  ];

  return (
    <section className="relative overflow-hidden px-4 py-28">
      <div className="pointer-events-none absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary/5 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
          {t.showcase.label}
        </p>
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {t.showcase.title}
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-foreground-muted">
          {t.showcase.subtitle}
        </p>

        {/* Tabs */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary/15 text-primary shadow-lg shadow-primary/10"
                  : "text-foreground-muted hover:bg-white/[0.04] hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Concept Ads — image ad mockups */}
        {activeTab === "concept" && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {conceptMockups.map((ad, i) => (
              <div
                key={i}
                className={`group relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br ${CONCEPT_GRADIENTS[i]} p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
                    {CONCEPT_BRANDS[i]}
                  </p>
                  <div>
                    <h3 className="whitespace-pre-line text-2xl font-bold leading-tight text-white sm:text-xl lg:text-2xl">
                      {ad.headline}
                    </h3>
                    <p className="mt-2 text-xs text-white/70">{ad.sub}</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                      {ad.cta} →
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stealth Ads — recreated image ads with badge */}
        {activeTab === "stealth" && (
          <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-3">
            {stealthMockups.map((ad, i) => (
              <div
                key={i}
                className={`group relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br ${STEALTH_GRADIENTS[i]} p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_60%)]" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
                      {STEALTH_BRANDS[i]}
                    </p>
                    <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-medium text-white/80 backdrop-blur-sm">
                      {t.showcase.stealthBadge}
                    </span>
                  </div>
                  <div>
                    <h3 className="whitespace-pre-line text-2xl font-bold leading-tight text-white">
                      {ad.headline}
                    </h3>
                    <p className="mt-2 text-xs text-white/70">{ad.sub}</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                      {ad.cta} →
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content Adapt — reference → your brand copy */}
        {activeTab === "content" && (
          <div className="mx-auto max-w-3xl space-y-6">
            {adaptExamples.map((ex, i) => (
              <div
                key={i}
                className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
              >
                <div className="rounded-xl glass p-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-foreground-subtle">
                    {t.showcase.adaptRefLabel}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground-muted">
                    {ex.ref}
                  </p>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="h-5 w-5 text-primary sm:rotate-0 rotate-90" />
                </div>
                <div className="rounded-xl glass border border-primary/20 p-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                    {t.showcase.adaptResultLabel}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">
                    {ex.result}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
