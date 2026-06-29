import { UserPlus, KeyRound, Wand2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

interface HowItWorksProps {
  t: Dictionary;
}

export function HowItWorks({ t }: HowItWorksProps) {
  const STEPS = [
    { n: 1, title: t.howItWorks.step1, body: t.howItWorks.step1Body, icon: UserPlus },
    { n: 2, title: t.howItWorks.step2, body: t.howItWorks.step2Body, icon: KeyRound },
    { n: 3, title: t.howItWorks.step3, body: t.howItWorks.step3Body, icon: Wand2 },
  ];

  return (
    <section id="how-it-works" className="relative overflow-hidden px-4 py-28">
      <div className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[400px] rounded-full bg-blue-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
          {t.howItWorks.label}
        </p>
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t.howItWorks.title}
        </h2>
        <p className="mx-auto mb-16 max-w-xl text-center text-foreground-muted">
          {t.howItWorks.subtitle}
        </p>

        <div className="relative grid gap-8 sm:grid-cols-3">
          <div className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-12 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent sm:block" />

          {STEPS.map((step) => (
            <div key={step.n} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-primary/10" />
                <div className="absolute inset-2 rounded-full bg-primary/5 backdrop-blur-sm" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-700 shadow-lg shadow-primary/25">
                  <step.icon className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {step.n}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-foreground-muted">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
