import { Shield, KeyRound, Zap } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

interface ByokExplainerProps {
  t: Dictionary;
}

export function ByokExplainer({ t }: ByokExplainerProps) {
  const POINTS = [
    { title: t.byok.point1, body: t.byok.point1Body, icon: KeyRound, gradient: "from-emerald-500 to-green-600" },
    { title: t.byok.point2, body: t.byok.point2Body, icon: Shield, gradient: "from-sky-500 to-blue-600" },
    { title: t.byok.point3, body: t.byok.point3Body, icon: Zap, gradient: "from-amber-500 to-orange-600" },
  ];

  return (
    <section className="relative px-4 py-28">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
          {t.byok.label}
        </p>
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t.byok.title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-foreground-muted">
          {t.byok.subtitle}
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {POINTS.map((point) => (
            <div
              key={point.title}
              className="group cursor-pointer rounded-2xl glass p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
            >
              <div
                className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${point.gradient} shadow-lg`}
              >
                <point.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-foreground">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                {point.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
