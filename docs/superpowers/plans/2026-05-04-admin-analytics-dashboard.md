# Admin Analytics Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained page view tracking system and admin-only analytics dashboard at `/app/admin`.

**Architecture:** Lightweight client-side tracker fires POST to `/api/analytics/track` on every route change via `usePathname()`. Data stored in a `page_views` Supabase table. Admin dashboard aggregates page_views + profiles + saved_ads into stat cards and daily trend bars. All admin endpoints gated by `requireAdmin()`.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + service role for inserts), Tailwind CSS, TanStack Query.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/page_views.sql` | Migration SQL for page_views table + RLS |
| Create | `src/services/analyticsService.ts` | DB queries for tracking inserts + admin stats aggregation |
| Create | `src/app/api/analytics/track/route.ts` | POST endpoint — records a page view (public, uses service role) |
| Create | `src/app/api/admin/stats/route.ts` | GET endpoint — returns aggregated analytics (admin-only) |
| Create | `src/hooks/api/useAdminStats.ts` | TanStack Query hook for admin stats |
| Create | `src/components/analytics/PageViewTracker.tsx` | Client component — fires tracking beacon on route changes |
| Create | `src/app/app/admin/page.tsx` | Admin dashboard page with stat cards + daily trends |
| Modify | `src/app/layout.tsx` | Add `<PageViewTracker />` inside providers |
| Modify | `src/lib/i18n/vi.ts` | Add `admin` section to Vietnamese translations |
| Modify | `src/lib/i18n/en.ts` | Add `admin` section to English translations |
| Modify | `src/lib/query/keys.ts` | Add `admin` query key namespace |
| Modify | `src/components/layout/DashboardLayout.tsx` | Add Admin nav link (visible only to admins) |

---

### Task 1: Create `page_views` table in Supabase

**Files:**
- Create: `supabase/migrations/page_views.sql`

- [ ] **Step 1: Write migration SQL**

```sql
CREATE TABLE public.page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  session_id TEXT NOT NULL,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX idx_page_views_session_path ON public.page_views (session_id, path);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY page_views_admin_read ON public.page_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = true)
  );
```

Save this to `supabase/migrations/page_views.sql`.

- [ ] **Step 2: Apply migration via Supabase MCP**

Run the SQL using `mcp__supabase__execute_sql` or apply via Supabase Dashboard SQL Editor.

- [ ] **Step 3: Verify table exists**

Query: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'page_views' ORDER BY ordinal_position;`

Expected: 4 columns (id, path, session_id, referrer, created_at).

---

### Task 2: Create analytics service

**Files:**
- Create: `src/services/analyticsService.ts`

- [ ] **Step 1: Write the service**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/user-context";

interface TrackInput {
  path: string;
  sessionId: string;
  referrer: string | null;
}

interface DailyCount {
  date: string;
  views: number;
  visitors: number;
}

interface AdminStats {
  totalPageViews: number;
  totalVisitors: number;
  totalAccounts: number;
  totalAdsSaved: number;
  daily: DailyCount[];
  topPages: { path: string; views: number }[];
}

export class AnalyticsService {
  constructor(private supabase: SupabaseClient) {}

  async track(input: TrackInput): Promise<void> {
    const { error } = await this.supabase.from("page_views").insert({
      path: input.path,
      session_id: input.sessionId,
      referrer: input.referrer,
    });
    if (error) throw new ApiError(500, "tracking_failed", error.message);
  }

  async getStats(days: number): Promise<AdminStats> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString();

    const [viewsRes, visitorsRes, accountsRes, adsRes, dailyRes, topPagesRes] =
      await Promise.all([
        this.supabase
          .from("page_views")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sinceISO),
        this.supabase.rpc("count_unique_sessions", { since_date: sinceISO }),
        this.supabase
          .from("profiles")
          .select("*", { count: "exact", head: true }),
        this.supabase
          .from("saved_ads")
          .select("*", { count: "exact", head: true }),
        this.supabase.rpc("daily_page_view_stats", {
          since_date: sinceISO,
        }),
        this.supabase.rpc("top_pages", {
          since_date: sinceISO,
          page_limit: 10,
        }),
      ]);

    return {
      totalPageViews: viewsRes.count ?? 0,
      totalVisitors: (visitorsRes.data as number) ?? 0,
      totalAccounts: accountsRes.count ?? 0,
      totalAdsSaved: adsRes.count ?? 0,
      daily: (dailyRes.data as DailyCount[]) ?? [],
      topPages:
        (topPagesRes.data as { path: string; views: number }[]) ?? [],
    };
  }
}
```

---

### Task 3: Create Supabase RPC functions for stats aggregation

**Files:**
- Migration applied via Supabase MCP

- [ ] **Step 1: Create the RPC functions**

```sql
-- Count unique sessions since a given date
CREATE OR REPLACE FUNCTION public.count_unique_sessions(since_date TIMESTAMPTZ)
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT session_id) FROM public.page_views WHERE created_at >= since_date;
$$;

-- Daily page view + visitor stats
CREATE OR REPLACE FUNCTION public.daily_page_view_stats(since_date TIMESTAMPTZ)
RETURNS TABLE(date TEXT, views BIGINT, visitors BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    to_char(created_at::date, 'YYYY-MM-DD') AS date,
    COUNT(*) AS views,
    COUNT(DISTINCT session_id) AS visitors
  FROM public.page_views
  WHERE created_at >= since_date
  GROUP BY created_at::date
  ORDER BY created_at::date;
$$;

-- Top pages by view count
CREATE OR REPLACE FUNCTION public.top_pages(since_date TIMESTAMPTZ, page_limit INT)
RETURNS TABLE(path TEXT, views BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT path, COUNT(*) AS views
  FROM public.page_views
  WHERE created_at >= since_date
  GROUP BY path
  ORDER BY views DESC
  LIMIT page_limit;
$$;
```

- [ ] **Step 2: Apply via Supabase MCP and verify**

Query: `SELECT public.count_unique_sessions(now() - interval '30 days');`
Expected: Returns `0` (no data yet).

---

### Task 4: Create tracking API route

**Files:**
- Create: `src/app/api/analytics/track/route.ts`

- [ ] **Step 1: Write the route handler**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnalyticsService } from "@/services/analyticsService";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      path?: string;
      sessionId?: string;
      referrer?: string | null;
    } | null;

    if (!body?.path || !body?.sessionId) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const service = new AnalyticsService(supabase);
    await service.track({
      path: body.path.slice(0, 500),
      sessionId: body.sessionId.slice(0, 64),
      referrer: body.referrer?.slice(0, 1000) ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "tracking_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify with curl**

```bash
curl -X POST http://localhost:3000/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"path":"/test","sessionId":"abc123","referrer":null}'
```

Expected: `{"ok":true}`

---

### Task 5: Create PageViewTracker component

**Files:**
- Create: `src/components/analytics/PageViewTracker.tsx`

- [ ] **Step 1: Write the tracker component**

```tsx
"use client";
// Client Component: sends page view beacon on route changes

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function getSessionId(): string {
  const KEY = "adlance_sid";
  let sid = sessionStorage.getItem(KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(KEY, sid);
  }
  return sid;
}

export function PageViewTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const sessionId = getSessionId();
    const body = JSON.stringify({
      path: pathname,
      sessionId,
      referrer: document.referrer || null,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/track",
        new Blob([body], { type: "application/json" }),
      );
    } else {
      void fetch("/api/analytics/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      });
    }
  }, [pathname]);

  return null;
}
```

---

### Task 6: Add tracker to root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Import and add the component**

Add import at top:
```typescript
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
```

Add `<PageViewTracker />` inside the `<body>` tag, after `<AppProvider>`:
```tsx
<AppProvider>
  {children}
  <PageViewTracker />
</AppProvider>
```

---

### Task 7: Create admin stats API route

**Files:**
- Create: `src/app/api/admin/stats/route.ts`

- [ ] **Step 1: Write the admin-only endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/user-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnalyticsService } from "@/services/analyticsService";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
    const safeDays = Math.min(Math.max(days, 1), 90);

    const supabase = createAdminClient();
    const service = new AnalyticsService(supabase);
    const stats = await service.getStats(safeDays);

    return NextResponse.json(stats);
  } catch (e) {
    return handleApiError(e);
  }
}
```

---

### Task 8: Add query keys and hook

**Files:**
- Modify: `src/lib/query/keys.ts`
- Create: `src/hooks/api/useAdminStats.ts`

- [ ] **Step 1: Add admin query key**

In `src/lib/query/keys.ts`, add to the queryKeys object:

```typescript
admin: {
  stats: (days: number) => ["admin", "stats", days] as const,
},
```

- [ ] **Step 2: Write the hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

interface DailyCount {
  date: string;
  views: number;
  visitors: number;
}

interface AdminStats {
  totalPageViews: number;
  totalVisitors: number;
  totalAccounts: number;
  totalAdsSaved: number;
  daily: DailyCount[];
  topPages: { path: string; views: number }[];
}

export function useAdminStats(days: number) {
  return useQuery({
    queryKey: queryKeys.admin.stats(days),
    queryFn: () =>
      apiFetch<AdminStats>(`/api/admin/stats?days=${days}`),
  });
}
```

---

### Task 9: Add i18n translations

**Files:**
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/en.ts`

- [ ] **Step 1: Add admin section to `vi.ts`**

Add after the last section in the `vi` object:

```typescript
admin: {
  title: "Quản trị",
  dashboard: "Bảng điều khiển",
  totalPageViews: "Lượt xem trang",
  totalVisitors: "Khách truy cập",
  totalAccounts: "Tài khoản",
  totalAdsSaved: "Quảng cáo đã lưu",
  dailyTrend: "Xu hướng theo ngày",
  topPages: "Trang phổ biến",
  views: "Lượt xem",
  visitors: "Khách",
  path: "Đường dẫn",
  today: "Hôm nay",
  last7Days: "7 ngày",
  last30Days: "30 ngày",
  noData: "Chưa có dữ liệu",
},
```

- [ ] **Step 2: Add admin section to `en.ts`**

```typescript
admin: {
  title: "Admin",
  dashboard: "Dashboard",
  totalPageViews: "Page Views",
  totalVisitors: "Visitors",
  totalAccounts: "Accounts",
  totalAdsSaved: "Ads Saved",
  dailyTrend: "Daily Trend",
  topPages: "Top Pages",
  views: "Views",
  visitors: "Visitors",
  path: "Path",
  today: "Today",
  last7Days: "7 days",
  last30Days: "30 days",
  noData: "No data yet",
},
```

- [ ] **Step 3: Add `admin` nav link to `vi.ts` and `en.ts` nav section**

In `vi.ts` nav section add: `admin: "Quản trị",`
In `en.ts` nav section add: `admin: "Admin",`

---

### Task 10: Create admin dashboard page

**Files:**
- Create: `src/app/app/admin/page.tsx`

- [ ] **Step 1: Write the admin page**

This is a Client Component page that:
- Uses `DashboardLayout` with `activePath="/app/admin"`
- Checks `isAdmin(profile.role)` — redirects non-admins to `/app`
- Shows 4 stat cards (page views, visitors, accounts, ads saved)
- Time range selector (today / 7d / 30d)
- Daily trend CSS bar chart
- Top pages table

Full implementation in `src/app/app/admin/page.tsx`:

```tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Adlance",
};

export default function AdminPage() {
  return (
    <DashboardLayout activePath="/app/admin">
      <AdminDashboard />
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Create the AdminDashboard client component**

Create `src/features/admin/components/AdminDashboard.tsx`:

```tsx
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
```

---

### Task 11: Add Admin link to sidebar navigation

**Files:**
- Modify: `src/components/layout/DashboardLayout.tsx`

- [ ] **Step 1: Import `isAdmin` and add ShieldAlert icon**

Add to imports:
```typescript
import { isAdmin } from "@/features/auth/types";
```

Add `ShieldAlert` to the lucide-react import list.

- [ ] **Step 2: Add admin nav item conditionally**

Inside the `DashboardLayout` component, after the "Account" nav section (`<SidebarNavLink>` for settings), add a conditional admin section:

```tsx
{profile && isAdmin(profile.role) && (
  <div className="mt-6">
    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-foreground-subtle/70">
      {t.admin.title}
    </p>
    <div className="space-y-0.5">
      <SidebarNavLink
        href="/app/admin"
        icon={ShieldAlert}
        label={t.nav.admin}
        isActive={activePath === "/app/admin"}
        onClick={() => setSidebarOpen(false)}
      />
    </div>
  </div>
)}
```

---

### Task 12: Verify end-to-end

- [ ] **Step 1: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Start dev server and test tracking**

1. Open browser to `http://localhost:3000`
2. Navigate between pages
3. Check Supabase `page_views` table — rows should appear

- [ ] **Step 3: Test admin dashboard**

1. Login as admin (`vokhanhduy.work@gmail.com`)
2. Navigate to `/app/admin`
3. Verify stat cards, daily trend, and top pages render correctly
4. Switch time ranges (Today / 7d / 30d)

- [ ] **Step 4: Test non-admin access**

1. Login as non-admin user
2. Verify Admin link does NOT appear in sidebar
3. Navigate directly to `/app/admin` — should redirect to `/app`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin): add page view tracking and analytics dashboard"
```
