import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

interface HeroSectionProps {
  t: Dictionary;
}

export function HeroSection({ t }: HeroSectionProps) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-16 pt-28">
      {/* Animated gradient background layers */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute inset-0 dot-pattern" />
      <div className="pointer-events-none absolute left-1/2 top-[20%] h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[15%] h-[300px] w-[400px] rounded-full bg-blue-600/8 blur-[120px]" />
      <div className="pointer-events-none absolute right-[10%] top-[60%] h-[250px] w-[350px] rounded-full bg-violet-500/6 blur-[100px]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        {/* Badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-5 py-2 text-sm font-medium text-primary backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5" />
            {t.hero.badge}
          </div>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-center text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="text-gradient-hero">{t.hero.line1}</span>
          <br />
          <span className="text-gradient-primary">{t.hero.line2}</span>
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-center text-lg leading-relaxed text-foreground-muted sm:text-xl">
          {t.hero.subtitle}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="group inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-primary px-10 py-4 text-base font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_0_40px_hsl(262_83%_65%/0.5)]"
          >
            {t.hero.cta}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border-strong px-10 py-4 text-base font-medium text-foreground transition-all duration-300 hover:border-foreground-subtle hover:bg-white/[0.04]"
          >
            {t.hero.secondary}
          </Link>
        </div>

        {/* Product mockup — shows a realistic app preview with example ads inside */}
        <div className="mx-auto mt-20 max-w-5xl perspective-[2000px]">
          <div className="rounded-2xl p-px glow-primary">
            <div className="overflow-hidden rounded-2xl glass-strong shadow-2xl shadow-primary/10">
              {/* Browser chrome */}
              <div className="flex items-center gap-3 border-b border-border/40 bg-background-elevated/60 px-5 py-3">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-danger/30" />
                  <div className="h-3 w-3 rounded-full bg-warning/30" />
                  <div className="h-3 w-3 rounded-full bg-success/30" />
                </div>
                <div className="flex-1">
                  <div className="mx-auto h-6 w-64 rounded-lg bg-foreground/[0.04] px-3 text-center text-xs leading-6 text-foreground-subtle">
                    app.adlance.com
                  </div>
                </div>
              </div>
              {/* Fake app UI: left panel + right ad grid */}
              <div className="flex min-h-[380px] sm:min-h-[420px]">
                {/* Left: controls */}
                <div className="hidden w-72 shrink-0 border-r border-border/30 bg-background-subtle/30 p-5 md:block">
                  <div className="mb-4 h-3 w-20 rounded bg-foreground/[0.08]" />
                  <div className="mb-3 h-9 rounded-lg border border-border/40 bg-background-elevated/50" />
                  <div className="mb-4 h-3 w-28 rounded bg-foreground/[0.08]" />
                  <div className="mb-3 h-9 rounded-lg border border-border/40 bg-background-elevated/50" />
                  <div className="mb-4 h-3 w-16 rounded bg-foreground/[0.08]" />
                  <div className="mb-6 h-20 rounded-lg border border-border/40 bg-background-elevated/50" />
                  <div className="h-10 rounded-xl bg-primary/80" />
                </div>
                {/* Right: ad output grid */}
                <div className="flex-1 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="h-3 w-32 rounded bg-foreground/[0.08]" />
                    <div className="h-7 w-20 rounded-lg bg-foreground/[0.05]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {/* Mini ad mockup cards */}
                    <div className="aspect-[4/5] rounded-xl bg-gradient-to-br from-rose-500/80 via-pink-600/80 to-purple-700/80 p-3">
                      <div className="mt-auto flex h-full flex-col justify-end">
                        <div className="h-2 w-12 rounded bg-white/40" />
                        <div className="mt-1.5 h-3 w-20 rounded bg-white/70" />
                        <div className="mt-1 h-2 w-16 rounded bg-white/30" />
                      </div>
                    </div>
                    <div className="aspect-[4/5] rounded-xl bg-gradient-to-br from-sky-500/80 to-blue-700/80 p-3">
                      <div className="flex h-full flex-col justify-end">
                        <div className="h-2 w-10 rounded bg-white/40" />
                        <div className="mt-1.5 h-3 w-24 rounded bg-white/70" />
                        <div className="mt-1 h-2 w-14 rounded bg-white/30" />
                      </div>
                    </div>
                    <div className="hidden aspect-[4/5] rounded-xl bg-gradient-to-br from-amber-500/80 to-orange-700/80 p-3 sm:block">
                      <div className="flex h-full flex-col justify-end">
                        <div className="h-2 w-14 rounded bg-white/40" />
                        <div className="mt-1.5 h-3 w-18 rounded bg-white/70" />
                        <div className="mt-1 h-2 w-12 rounded bg-white/30" />
                      </div>
                    </div>
                    <div className="aspect-[4/5] rounded-xl bg-gradient-to-br from-emerald-500/80 to-teal-700/80 p-3">
                      <div className="flex h-full flex-col justify-end">
                        <div className="h-2 w-10 rounded bg-white/40" />
                        <div className="mt-1.5 h-3 w-20 rounded bg-white/70" />
                        <div className="mt-1 h-2 w-16 rounded bg-white/30" />
                      </div>
                    </div>
                    <div className="aspect-[4/5] rounded-xl bg-gradient-to-br from-violet-500/80 to-indigo-700/80 p-3">
                      <div className="flex h-full flex-col justify-end">
                        <div className="h-2 w-12 rounded bg-white/40" />
                        <div className="mt-1.5 h-3 w-22 rounded bg-white/70" />
                        <div className="mt-1 h-2 w-14 rounded bg-white/30" />
                      </div>
                    </div>
                    <div className="hidden aspect-[4/5] rounded-xl bg-gradient-to-br from-fuchsia-500/80 to-pink-700/80 p-3 sm:block">
                      <div className="flex h-full flex-col justify-end">
                        <div className="h-2 w-8 rounded bg-white/40" />
                        <div className="mt-1.5 h-3 w-20 rounded bg-white/70" />
                        <div className="mt-1 h-2 w-12 rounded bg-white/30" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
