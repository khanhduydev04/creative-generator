import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

interface CtaSectionProps {
  t: Dictionary;
}

export function CtaSection({ t }: CtaSectionProps) {
  return (
    <section className="relative overflow-hidden px-4 py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[160px]" />

      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {t.cta.title}{" "}
          <span className="text-gradient-primary">{t.cta.accent}</span>
        </h2>
        <p className="mt-5 text-lg text-foreground-muted">{t.cta.subtitle}</p>
        <Link
          href="/signup"
          className="group mt-10 inline-flex cursor-pointer items-center gap-2.5 rounded-2xl bg-primary px-10 py-4 text-lg font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_0_50px_hsl(262_83%_65%/0.5)]"
        >
          {t.cta.button}
          <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
