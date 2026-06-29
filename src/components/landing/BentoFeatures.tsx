// Client Component: requires i18n context + intersection observer for scroll animation
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  EyeOff,
  FolderOpen,
  KeyRound,
  Fingerprint,
  Languages,
} from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";

const CARD =
  "group relative cursor-pointer overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/40 backdrop-blur-sm";

const STACK_OFFSETS: { x: string; y: string; rot: number }[] = [
  { x: "calc(100% + 20px)", y: "calc(50% + 10px)", rot: -6 },
  { x: "0px", y: "calc(50% + 10px)", rot: 3 },
  { x: "calc(-100% - 20px)", y: "calc(50% + 10px)", rot: -4 },
  { x: "calc(100% + 20px)", y: "calc(-50% - 10px)", rot: 5 },
  { x: "0px", y: "calc(-50% - 10px)", rot: -2 },
  { x: "calc(-100% - 20px)", y: "calc(-50% - 10px)", rot: 7 },
];

export function BentoFeatures() {
  const { t } = useT();
  const gridRef = useRef<HTMLDivElement>(null);
  const [spread, setSpread] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSpread(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!spread) return;
    const id = setTimeout(() => setDone(true), 1500);
    return () => clearTimeout(id);
  }, [spread]);

  const state = done ? "bento-done" : spread ? "bento-spread" : "bento-stacked";

  const sty = (i: number): React.CSSProperties =>
    ({
      "--bx": STACK_OFFSETS[i].x,
      "--by": STACK_OFFSETS[i].y,
      "--br": `${STACK_OFFSETS[i].rot}deg`,
      "--bd": `${i * 0.09}s`,
    }) as React.CSSProperties;

  return (
    <section className="relative overflow-hidden px-4 py-28">
      <div className="pointer-events-none absolute left-1/4 top-0 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary/[0.03] blur-[200px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[600px] w-[600px] translate-x-1/2 rounded-full bg-violet-500/[0.03] blur-[200px]" />

      <div className="relative mx-auto max-w-6xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
          {t.features.label}
        </p>
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {t.features.title}
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-base leading-relaxed text-foreground-muted lg:mb-20">
          {t.features.subtitle}
        </p>

        {/* 3 × 2 equal grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {/* ── 0 · Concept Ads ── */}
          <article
            className={`${CARD} ${state} hover:border-violet-500/30 hover:shadow-[0_8px_40px_hsl(262_83%_65%/0.12)]`}
            style={sty(0)}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/[0.07] blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative p-7">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 transition-transform duration-300 group-hover:scale-110">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                {t.features.conceptAds}
              </h3>
              <p className="text-sm leading-relaxed text-foreground-muted">
                {t.features.conceptAdsBody}
              </p>

              <div className="mt-5 flex items-end gap-2">
                <div className="h-14 w-10 -rotate-3 rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-500/20 to-purple-500/5 p-1 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                  <div className="mb-0.5 h-4 w-full rounded bg-violet-400/20" />
                  <div className="h-1 w-3/4 rounded bg-violet-400/10" />
                </div>
                <div className="h-16 w-10 rounded-lg border border-pink-500/20 bg-gradient-to-br from-pink-500/15 to-rose-500/5 p-1 transition-transform duration-300 group-hover:scale-110">
                  <div className="mb-0.5 h-5 w-full rounded bg-pink-400/20" />
                  <div className="h-1 w-full rounded bg-pink-400/10" />
                </div>
                <div className="h-14 w-10 rotate-2 rounded-lg border border-sky-500/20 bg-gradient-to-br from-sky-500/15 to-blue-500/5 p-1 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
                  <div className="mb-0.5 h-4 w-full rounded bg-sky-400/20" />
                  <div className="h-1 w-3/4 rounded bg-sky-400/10" />
                </div>
              </div>
            </div>
          </article>

          {/* ── 1 · Stealth Ads ── */}
          <article
            className={`${CARD} ${state} hover:border-sky-500/30 hover:shadow-[0_8px_40px_hsl(199_89%_48%/0.1)]`}
            style={sty(1)}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/[0.07] blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative p-7">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20 transition-transform duration-300 group-hover:scale-110">
                <EyeOff className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                {t.features.stealthAds}
              </h3>
              <p className="text-sm leading-relaxed text-foreground-muted">
                {t.features.stealthAdsBody}
              </p>

              <div className="mt-5 space-y-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-sky-500/[0.08]">
                  <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-sky-500/30 to-transparent" />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-sky-500/[0.08]">
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-sky-500/20 to-transparent" />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-sky-500/[0.08]">
                  <div className="h-full w-[90%] rounded-full bg-gradient-to-r from-sky-500/25 to-transparent" />
                </div>
              </div>
            </div>
          </article>

          {/* ── 2 · Library ── */}
          <article
            className={`${CARD} ${state} hover:border-amber-500/30 hover:shadow-[0_8px_40px_hsl(38_92%_50%/0.1)]`}
            style={sty(2)}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/[0.07] blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative p-7">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 transition-transform duration-300 group-hover:scale-110">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                {t.features.library}
              </h3>
              <p className="text-sm leading-relaxed text-foreground-muted">
                {t.features.libraryBody}
              </p>

              <div className="mt-5 grid grid-cols-4 gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md border border-amber-500/10 bg-gradient-to-br from-amber-500/15 to-orange-500/5 transition-colors duration-300 group-hover:from-amber-500/25 group-hover:to-orange-500/10"
                  />
                ))}
              </div>
            </div>
          </article>

          {/* ── 3 · BYOK ── */}
          <article
            className={`${CARD} ${state} hover:border-emerald-500/30 hover:shadow-[0_8px_40px_hsl(160_84%_39%/0.1)]`}
            style={sty(3)}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/[0.07] blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative p-7">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20 transition-transform duration-300 group-hover:scale-110">
                <KeyRound className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                {t.features.byok}
              </h3>
              <p className="text-sm leading-relaxed text-foreground-muted">
                {t.features.byokBody}
              </p>

              <div className="mt-5 flex items-center gap-1 font-mono text-sm">
                <span className="text-emerald-400/70">sk-</span>
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/40"
                    style={{
                      animation: "bento-pulse 2s ease-in-out infinite",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </article>

          {/* ── 4 · Brand DNA ── */}
          <article
            className={`${CARD} ${state} hover:border-pink-500/30 hover:shadow-[0_8px_40px_hsl(330_81%_60%/0.1)]`}
            style={sty(4)}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-400/30 to-transparent" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-500/[0.07] blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative p-7">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/20 transition-transform duration-300 group-hover:scale-110">
                <Fingerprint className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                {t.features.brandDna}
              </h3>
              <p className="text-sm leading-relaxed text-foreground-muted">
                {t.features.brandDnaBody}
              </p>

              <div className="mt-5 flex gap-2.5">
                {[
                  "from-violet-500 to-purple-600",
                  "from-pink-500 to-rose-600",
                  "from-sky-500 to-blue-600",
                  "from-amber-500 to-orange-600",
                  "from-emerald-500 to-green-600",
                ].map((g, i) => (
                  <div
                    key={i}
                    className={`h-6 w-6 rounded-full bg-gradient-to-br ${g} shadow-sm transition-transform duration-300 group-hover:scale-110`}
                    style={{ transitionDelay: `${i * 50}ms` }}
                  />
                ))}
              </div>
            </div>
          </article>

          {/* ── 5 · Content Adapt ── */}
          <article
            className={`${CARD} ${state} hover:border-cyan-500/30 hover:shadow-[0_8px_40px_hsl(187_72%_48%/0.1)]`}
            style={sty(5)}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/[0.07] blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative p-7">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/20 transition-transform duration-300 group-hover:scale-110">
                <Languages className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                {t.features.contentAdapt}
              </h3>
              <p className="text-sm leading-relaxed text-foreground-muted">
                {t.features.contentAdaptBody}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {["VI", "EN", "JA", "KO", "FR", "DE"].map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full border border-cyan-500/20 bg-cyan-500/[0.08] px-3 py-1 text-xs font-semibold tracking-wide text-cyan-400/80 transition-colors duration-300 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/[0.15]"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
