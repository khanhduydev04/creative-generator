"use client";
// Client Component: admin analytics dashboard with stat cards and daily trend chart

import { useAuth } from "@/features/auth/context";
import { isAdmin } from "@/features/auth/types";
import { useAdminStats } from "@/hooks/api/useAdminStats";
import { useT } from "@/lib/i18n/useTranslation";
import {
  BarChart3,
  Eye,
  FileImage,
  Loader2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const RANGES = [
  { days: 1, key: "today" as const },
  { days: 7, key: "last7Days" as const },
  { days: 30, key: "last30Days" as const },
];

export function AdminDashboard() {
  const { t } = useT();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState(30);
  const { data: stats, isLoading } = useAdminStats(days);

  useEffect(() => {
    if (!authLoading && (!profile || !isAdmin(profile.role))) {
      router.replace("/app");
    }
  }, [authLoading, profile, router]);

  if (authLoading || !profile || !isAdmin(profile.role)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-subtle" />
      </div>
    );
  }

  const maxViews = Math.max(...(stats?.daily.map((d) => d.views) ?? [1]), 1);

  const statCards = [
    {
      label: t.admin.totalPageViews,
      value: stats?.totalPageViews ?? 0,
      icon: Eye,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: t.admin.totalVisitors,
      value: stats?.totalVisitors ?? 0,
      icon: Users,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: t.admin.totalAccounts,
      value: stats?.totalAccounts ?? 0,
      icon: ShieldAlert,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      label: t.admin.totalAdsSaved,
      value: stats?.totalAdsSaved ?? 0,
      icon: FileImage,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t.admin.dashboard}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {t.admin.title}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                days === r.days
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {t.admin[r.key]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-foreground-subtle" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}
                  >
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {card.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-foreground-muted">
                  {card.label}
                </p>
              </div>
            ))}
          </div>

          {/* Daily trend */}
          <div className="mb-8 rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                {t.admin.dailyTrend}
              </h2>
            </div>
            {stats?.daily.length === 0 ? (
              <p className="py-8 text-center text-sm text-foreground-subtle">
                {t.admin.noData}
              </p>
            ) : (
              <div className="space-y-2">
                {stats?.daily.map((d) => (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-foreground-subtle">
                      {d.date.slice(5)}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-6 rounded-md bg-primary/20"
                        style={{
                          width: `${Math.max((d.views / maxViews) * 100, 2)}%`,
                        }}
                      >
                        <div
                          className="h-full rounded-md bg-primary/60"
                          style={{
                            width: `${maxViews > 0 ? (d.visitors / maxViews) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-foreground-muted">
                      {d.views} / {d.visitors}
                    </span>
                  </div>
                ))}
                <div className="mt-2 flex items-center gap-4 text-[10px] text-foreground-subtle">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-4 rounded-sm bg-primary/20" />
                    {t.admin.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-4 rounded-sm bg-primary/60" />
                    {t.admin.visitors}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Top pages */}
          <div className="rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-sm font-bold text-foreground">
              {t.admin.topPages}
            </h2>
            {stats?.topPages.length === 0 ? (
              <p className="py-8 text-center text-sm text-foreground-subtle">
                {t.admin.noData}
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                    <th className="pb-2">{t.admin.path}</th>
                    <th className="pb-2 text-right">{t.admin.views}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.topPages.map((page) => (
                    <tr
                      key={page.path}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="py-2.5 font-mono text-xs text-foreground-muted">
                        {page.path}
                      </td>
                      <td className="py-2.5 text-right text-xs font-semibold text-foreground">
                        {page.views.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
