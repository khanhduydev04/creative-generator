# Apify Sync UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Apify Sync section to the brand Setup page — admins configure the Apify task ID and toggle sync on/off; all active users can trigger a manual sync.

**Architecture:** New `POST /api/video/apify-config/sync` route reuses existing `apifySyncService` helpers. A new `useApifyConfig` hook follows the existing TanStack Query pattern. `ApifySyncSection` component gates admin inputs via `isAdmin(profile.role)` and shows sync status to all users. The section is wired into `BrandSetupForm` as a standalone block after Brand Intelligence.

**Tech Stack:** Next.js App Router, React, TanStack Query, Supabase, TypeScript, Tailwind CSS

## Global Constraints

- Next.js App Router only. No Pages Router.
- `"use client"` required — add justification comment above it.
- TypeScript: no `any`, no type assertions without explanation comment.
- Tailwind CSS only. No inline `style` objects except dynamic values.
- No barrel `index.ts` files — import directly from source.
- Hook pattern: `src/hooks/api/useXxx.ts` with TanStack Query `useQuery`/`useMutation`.
- Admin check: `isAdmin(profile?.role)` from `@/features/auth/types`.
- `BrandApifyConfig` type is already defined in `src/features/video/types.ts` — do not redefine it.
- Existing services to reuse: `BrandApifyConfigService` (`src/services/brandApifyConfigService.ts`), `fetchLastSucceededRun` + `fetchDatasetItems` from `src/services/apifySyncService.ts`, `CompetitorVideoService` (`src/services/competitorVideoService.ts`).

---

### Task 1: New manual sync route `POST /api/video/apify-config/sync`

**Files:**
- Create: `src/app/api/video/apify-config/sync/route.ts`
- Create: `src/app/api/__tests__/apify-config-sync.test.ts`

**Interfaces:**
- Produces: `POST /api/video/apify-config/sync` body `{ brandId: string }` → `{ ok: true, upserted: number }` on success, or `{ error: string }` with appropriate HTTP status on failure

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/__tests__/apify-config-sync.test.ts
import { NextRequest } from "next/server";

jest.mock("@/lib/user-context", () => ({
  requireUser: jest.fn().mockResolvedValue({ userId: "user-1" }),
  handleApiError: jest.fn((e: unknown) =>
    new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  ),
}));
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({}),
}));
jest.mock("@/services/brandApifyConfigService", () => ({
  BrandApifyConfigService: jest.fn().mockImplementation(() => ({
    getByBrand: jest.fn().mockResolvedValue({
      apify_task_id: "task-abc",
      is_enabled: true,
    }),
    markSynced: jest.fn().mockResolvedValue(undefined),
    markError: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock("@/services/apifySyncService", () => ({
  fetchLastSucceededRun: jest.fn().mockResolvedValue({ runId: "run-1", datasetId: "ds-1" }),
  fetchDatasetItems: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/services/competitorVideoService", () => ({
  CompetitorVideoService: jest.fn().mockImplementation(() => ({
    upsertVideos: jest.fn().mockResolvedValue(3),
  })),
}));

const ORIGINAL_ENV = process.env;
beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, APIFY_TOKEN: "tok" };
});
afterEach(() => {
  process.env = ORIGINAL_ENV;
});

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/video/apify-config/sync", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

it("returns 400 when brandId is missing", async () => {
  const { POST } = await import("@/app/api/video/apify-config/sync/route");
  const res = await POST(makeReq({}));
  expect(res.status).toBe(400);
});

it("returns 200 with upserted count on success", async () => {
  const { POST } = await import("@/app/api/video/apify-config/sync/route");
  const res = await POST(makeReq({ brandId: "brand-1" }));
  expect(res.status).toBe(200);
  const body = (await res.json()) as { ok: boolean; upserted: number };
  expect(body.ok).toBe(true);
  expect(body.upserted).toBe(3);
});

it("returns 404 when no succeeded run exists", async () => {
  const { fetchLastSucceededRun } = await import("@/services/apifySyncService");
  (fetchLastSucceededRun as jest.Mock).mockResolvedValueOnce(null);
  const { POST } = await import("@/app/api/video/apify-config/sync/route");
  const res = await POST(makeReq({ brandId: "brand-1" }));
  expect(res.status).toBe(404);
});

it("returns 400 when config has is_enabled false", async () => {
  const { BrandApifyConfigService } = await import("@/services/brandApifyConfigService");
  (BrandApifyConfigService as jest.Mock).mockImplementationOnce(() => ({
    getByBrand: jest.fn().mockResolvedValue({ apify_task_id: "t", is_enabled: false }),
    markSynced: jest.fn(),
    markError: jest.fn(),
  }));
  const { POST } = await import("@/app/api/video/apify-config/sync/route");
  const res = await POST(makeReq({ brandId: "brand-1" }));
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest src/app/api/__tests__/apify-config-sync.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/app/api/video/apify-config/sync/route'`

- [ ] **Step 3: Create the route**

```typescript
// src/app/api/video/apify-config/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { BrandApifyConfigService } from "@/services/brandApifyConfigService";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import { fetchLastSucceededRun, fetchDatasetItems } from "@/services/apifySyncService";

interface SyncBody {
  brandId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    // Safe: only brandId is consumed and validated immediately below
    const body = (await request.json()) as SyncBody;

    if (!body.brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    const token = process.env.APIFY_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "apify_token_missing" }, { status: 500 });
    }

    const supabase = await createClient();
    const configService = new BrandApifyConfigService(supabase);
    const config = await configService.getByBrand(body.brandId);

    if (!config) {
      return NextResponse.json({ error: "apify_config_not_found" }, { status: 404 });
    }

    if (!config.is_enabled) {
      return NextResponse.json({ error: "apify_sync_disabled" }, { status: 400 });
    }

    const lastRun = await fetchLastSucceededRun(config.apify_task_id, token);
    if (!lastRun) {
      return NextResponse.json({ error: "no_succeeded_run" }, { status: 404 });
    }

    const items = await fetchDatasetItems(lastRun.datasetId, token);
    const videoService = new CompetitorVideoService(supabase, userId);
    const upserted = await videoService.upsertVideos(body.brandId, items, lastRun.runId);
    await configService.markSynced(body.brandId, lastRun.runId, lastRun.datasetId);

    return NextResponse.json({ ok: true, upserted });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest src/app/api/__tests__/apify-config-sync.test.ts --no-coverage
```
Expected: PASS (4 tests)

---

### Task 2: `useApifyConfig` hook

**Files:**
- Create: `src/hooks/api/useApifyConfig.ts`

**Interfaces:**
- Produces three named exports:
  - `useApifyConfig(brandId: string | null)` — TanStack query returning `BrandApifyConfig | null`
  - `useSaveApifyConfig(brandId: string)` — mutation for `PUT /api/video/apify-config`
  - `useSyncApify(brandId: string)` — mutation for `POST /api/video/apify-config/sync`, returns `{ ok: boolean; upserted: number }`

- [ ] **Step 1: Create the hook file**

```typescript
// src/hooks/api/useApifyConfig.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BrandApifyConfig } from "@/features/video/types";

export function useApifyConfig(brandId: string | null) {
  return useQuery({
    queryKey: ["apify-config", brandId],
    queryFn: async () => {
      const res = await fetch(`/api/video/apify-config?brandId=${brandId}`);
      if (!res.ok) throw new Error("Failed to fetch apify config");
      const data = (await res.json()) as { config: BrandApifyConfig | null };
      return data.config;
    },
    enabled: !!brandId,
  });
}

export function useSaveApifyConfig(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { apifyTaskId: string; isEnabled: boolean }) => {
      const res = await fetch("/api/video/apify-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          apifyTaskId: payload.apifyTaskId,
          isEnabled: payload.isEnabled,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Failed to save apify config");
      }
      return (await res.json()) as { config: BrandApifyConfig };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["apify-config", brandId] });
    },
  });
}

export function useSyncApify(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/video/apify-config/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Sync failed");
      }
      return (await res.json()) as { ok: boolean; upserted: number };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["apify-config", brandId] });
    },
  });
}
```

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no new errors from `useApifyConfig.ts`

---

### Task 3: `ApifySyncSection` component

**Files:**
- Create: `src/features/brand/components/ApifySyncSection.tsx`

**Interfaces:**
- Consumes: `useApifyConfig`, `useSaveApifyConfig`, `useSyncApify` from `src/hooks/api/useApifyConfig.ts`; `isAdmin` from `@/features/auth/types`; `useAuth` from `@/features/auth/context`
- Produces: named export `ApifySyncSection({ brandId: string | null })`; returns `null` when `brandId` is null

- [ ] **Step 1: Create the component**

```tsx
"use client";
// Client Component: admin-gated Apify task ID config and manual sync trigger with live status

import { useAuth } from "@/features/auth/context";
import { isAdmin } from "@/features/auth/types";
import {
  useApifyConfig,
  useSaveApifyConfig,
  useSyncApify,
} from "@/hooks/api/useApifyConfig";
import { AlertCircle, CheckCircle2, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";

interface ApifySyncSectionProps {
  brandId: string | null;
}

export function ApifySyncSection({ brandId }: ApifySyncSectionProps) {
  const { profile } = useAuth();
  const canManage = Boolean(profile && isAdmin(profile.role));

  const configQuery = useApifyConfig(brandId);
  const saveMutation = useSaveApifyConfig(brandId ?? "");
  const syncMutation = useSyncApify(brandId ?? "");

  const config = configQuery.data ?? null;

  const [taskId, setTaskId] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (config) {
      setTaskId(config.apify_task_id);
      setIsEnabled(config.is_enabled);
    }
  }, [config]);

  if (!brandId) return null;

  async function handleSave() {
    if (!taskId.trim()) return;
    await saveMutation.mutateAsync({ apifyTaskId: taskId.trim(), isEnabled });
  }

  async function handleSync() {
    await syncMutation.mutateAsync();
  }

  const lastSynced = config?.last_synced_at
    ? new Date(config.last_synced_at).toLocaleString("vi-VN")
    : null;

  const syncResult = syncMutation.data as { upserted?: number } | undefined;

  return (
    <div className="mt-12">
      <section className="relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-8 backdrop-blur-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <RefreshCw className="h-4.5 w-4.5 text-primary" />
              </div>
              Apify Sync
            </h3>
            <p className="text-foreground-muted text-sm mt-1">
              Đồng bộ video đối thủ từ TikTok qua Apify task
            </p>
          </div>

          <button
            onClick={() => void handleSync()}
            disabled={!config?.is_enabled || syncMutation.isPending || !brandId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            {syncMutation.isPending ? "Đang sync..." : "Sync ngay"}
          </button>
        </div>

        {/* Status */}
        <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
          {config?.last_error ? (
            <span className="flex items-center gap-1.5 text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Lỗi lần trước: {config.last_error}
            </span>
          ) : lastSynced ? (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Lần cuối sync: {lastSynced}
            </span>
          ) : (
            <span className="text-foreground-muted">Chưa sync lần nào</span>
          )}
          {syncMutation.isSuccess && (
            <span className="text-emerald-600 font-medium">
              ✓ Sync thành công ({syncResult?.upserted ?? 0} video)
            </span>
          )}
          {syncMutation.isError && (
            <span className="text-red-500">
              Lỗi:{" "}
              {syncMutation.error instanceof Error
                ? syncMutation.error.message
                : "unknown"}
            </span>
          )}
        </div>

        {/* Admin config — hidden from members */}
        {canManage && (
          <div className="space-y-4 pt-4 border-t border-border-strong/20">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Bật tự động sync (cron)</label>
              <button
                type="button"
                onClick={() => setIsEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isEnabled ? "bg-primary" : "bg-border-strong"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Apify Task ID</label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Paste Apify task ID (ví dụ: ~abc123xyz)"
                className="w-full rounded-lg border border-border-strong/30 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void handleSave()}
                disabled={!taskId.trim() || saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-strong/30 text-sm font-medium disabled:opacity-50 hover:bg-primary/5 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
              {saveMutation.isSuccess && (
                <span className="text-sm text-emerald-600">✓ Đã lưu</span>
              )}
              {saveMutation.isError && (
                <span className="text-sm text-red-500">
                  Lỗi:{" "}
                  {saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : "unknown"}
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no new errors

---

### Task 4: Wire into `BrandSetupForm` + manual test

**Files:**
- Modify: `src/features/brand/components/BrandSetupForm.tsx`

**Interfaces:**
- Consumes: `ApifySyncSection` from Task 3

- [ ] **Step 1: Add import to BrandSetupForm**

In `src/features/brand/components/BrandSetupForm.tsx`, add to the import block (near other brand component imports):

```typescript
import { ApifySyncSection } from "@/features/brand/components/ApifySyncSection";
```

- [ ] **Step 2: Add section after Brand Intelligence**

In `src/features/brand/components/BrandSetupForm.tsx`, find the closing `</section>` and `</div>` that wrap the Brand Intelligence block (search for `brandIntelligence` string or the `Sparkles` icon section). After the closing `</div>` of that `mt-12` block, append:

```tsx
{/* Apify Sync */}
<ApifySyncSection brandId={selectedBrandId} />
```

- [ ] **Step 3: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual test**

1. `npm run dev`
2. Admin login → any brand Setup tab → scroll to bottom → confirm "Apify Sync" section with Task ID input + toggle + Save button
3. Member login → same → confirm only status row + "Sync ngay" button visible (no inputs)
4. Admin: enter any string in Task ID, click Save → confirm success feedback
5. If real `APIFY_TOKEN` is set and task ID is valid, click "Sync ngay" and verify success + video count

- [ ] **Step 5: Commit**

```bash
git add \
  src/app/api/video/apify-config/sync/route.ts \
  src/app/api/__tests__/apify-config-sync.test.ts \
  src/hooks/api/useApifyConfig.ts \
  src/features/brand/components/ApifySyncSection.tsx \
  src/features/brand/components/BrandSetupForm.tsx
git commit -m "feat(brand): Apify sync UI — admin config + manual sync button for all users"
```
