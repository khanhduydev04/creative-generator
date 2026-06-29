import type { Dictionary } from "@/lib/i18n/types";

interface StatsSectionProps {
  t: Dictionary;
}

export function StatsSection({ t }: StatsSectionProps) {
  const STATS = [
    { value: t.stats.freeValue, label: t.stats.freeLabel },
    { value: t.stats.featuresValue, label: t.stats.featuresLabel },
    { value: t.stats.stepsValue, label: t.stats.stepsLabel },
    { value: t.stats.limitValue, label: t.stats.limitLabel },
  ];

  return (
    <section className="border-y border-border/30 bg-background-subtle/30 py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-gradient-primary text-4xl font-bold sm:text-5xl">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-foreground-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
