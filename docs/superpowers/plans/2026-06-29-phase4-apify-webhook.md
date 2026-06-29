# Phase 4: Apify Webhook + Manual Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Stage 1 data ingestion — an Apify webhook endpoint that automatically upserts TikTok competitor videos when an Apify Actor run completes, plus a manual "Sync từ Apify" button on the Competitor Videos page.

**Architecture:** `POST /api/apify/webhook` receives the webhook call from Apify, fetches the dataset, and bulk-upserts into `competitor_videos`. `POST /api/video/sync-apify` is the manual trigger that does the same fetch without waiting for Apify. Both routes reuse a `upsertVideos` method added to `CompetitorVideoService`. The sync button is added to the existing `/app/video` page.

**Tech Stack:** Next.js App Router, Supabase, TanStack Query, TypeScript

---

## File Map

**Create:**
- `src/app/api/apify/webhook/route.ts` — Apify webhook receiver
- `src/app/api/video/sync-apify/route.ts` — manual sync endpoint

**Modify:**
- `src/services/competitorVideoService.ts` — add `upsertVideos` bulk method
- `src/lib/i18n/vi.ts` — add `video.syncApify` and `video.syncing` keys
- `src/lib/i18n/en.ts` — same keys in English
- `src/app/app/video/page.tsx` — add "Sync từ Apify" button + mutation hook

---

## Task 1: Add `upsertVideos` to CompetitorVideoService

**Files:**
- Modify: `src/services/competitorVideoService.ts`

- [ ] **Step 1: Add `ApifyVideoItem` type and `upsertVideos` method**

In `src/services/competitorVideoService.ts`, add after the imports block:

```typescript
export interface ApifyVideoItem {
  webVideoUrl?: string;
  id?: string;
  playCount?: number;
  diggCount?: number;
  shareCount?: number;
  commentCount?: number;
  authorMeta?: { name?: string };
  covers?: string[];
  createTime?: number;
  searchKey?: string; // apify run ID if passed
}
```

Then add this method inside the `CompetitorVideoService` class, after `updateStatus`:

```typescript
  async upsertVideos(brandId: string, items: ApifyVideoItem[], apifyRunId?: string): Promise<number> {
    if (items.length === 0) return 0;

    const rows = items
      .filter((item) => item.webVideoUrl?.includes("tiktok.com"))
      .map((item) => ({
        brand_id: brandId,
        tiktok_url: item.webVideoUrl!,
        video_id: item.id ?? extractTikTokVideoId(item.webVideoUrl!),
        views: item.playCount ?? null,
        likes: item.diggCount ?? null,
        shares: item.shareCount ?? null,
        comments: item.commentCount ?? null,
        author_handle: item.authorMeta?.name ?? null,
        cover_url: item.covers?.[0] ?? null,
        scraped_at: item.createTime
          ? new Date(item.createTime * 1000).toISOString()
          : new Date().toISOString(),
        apify_run_id: apifyRunId ?? null,
        status: "pending" as const,
        scrape_status: "success" as const,
      }));

    if (rows.length === 0) return 0;

    const { error } = await this.supabase
      .from("competitor_videos")
      .upsert(rows, { onConflict: "brand_id,tiktok_url", ignoreDuplicates: false });

    if (error) throw new Error(error.message);
    return rows.length;
  }
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 2: Add i18n Keys

**Files:**
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/en.ts`

- [ ] **Step 1: Add keys to `vi.ts`**

In `src/lib/i18n/vi.ts`, inside the `video: { ... }` block (after any existing key), add:

```typescript
    syncApify: "Sync từ Apify",
    syncing: "Đang sync...",
    syncSuccess: "Đã sync {0} video",
    syncFailed: "Sync thất bại",
    apifyDatasetId: "Apify Dataset ID",
    apifyDatasetIdPlaceholder: "Nhập dataset ID từ Apify...",
```

- [ ] **Step 2: Add same keys to `en.ts`**

```typescript
    syncApify: "Sync from Apify",
    syncing: "Syncing...",
    syncSuccess: "Synced {0} videos",
    syncFailed: "Sync failed",
    apifyDatasetId: "Apify Dataset ID",
    apifyDatasetIdPlaceholder: "Enter dataset ID from Apify...",
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 3: Apify Webhook Route

**Files:**
- Create: `src/app/api/apify/webhook/route.ts`

The Apify webhook is called when an Actor run completes. Apify sends a POST request. The `brandId` and `datasetId` are passed as query params (configured once per Actor in the Apify dashboard).

Apify's dataset items for TikTok scraper follow the `ApifyVideoItem` shape (play count as `playCount`, author as `authorMeta.name`, etc.). The actual field names depend on the specific Actor — the plan uses the most common shape from popular TikTok scrapers on Apify.

- [ ] **Step 1: Create the webhook route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import type { ApifyVideoItem } from "@/services/competitorVideoService";

const APIFY_BASE = "https://api.apify.com/v2";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const datasetId = searchParams.get("datasetId");

  // Always return 200 to prevent Apify from retrying endlessly
  if (!brandId || !datasetId) {
    console.warn("[apify/webhook] Missing brandId or datasetId");
    return NextResponse.json({ ok: true });
  }

  // Fetch dataset from Apify (no auth needed for public datasets; add token if private)
  let items: ApifyVideoItem[] = [];
  try {
    const apifyRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?clean=true&format=json`,
      { signal: AbortSignal.timeout(25000) },
    );

    if (!apifyRes.ok) {
      console.error(`[apify/webhook] Dataset fetch failed: ${apifyRes.status}`);
      // Return 500 so Apify retries
      return NextResponse.json({ error: "dataset_fetch_failed" }, { status: 500 });
    }

    items = (await apifyRes.json()) as ApifyVideoItem[];
  } catch (err) {
    console.error("[apify/webhook] Fetch error:", err);
    return NextResponse.json({ error: "fetch_error" }, { status: 500 });
  }

  try {
    const supabase = await createClient();

    // Verify brand exists (prevents processing for unknown brands)
    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .maybeSingle();

    if (!brand) {
      console.warn(`[apify/webhook] Unknown brandId: ${brandId}`);
      return NextResponse.json({ ok: true }); // 200, no retry
    }

    // Use service account (webhook has no user session)
    // RLS is bypassed via admin-level operations in production;
    // for now, createClient() uses the service role key if configured,
    // or use createAdminClient() for explicit bypass.
    const service = new CompetitorVideoService(supabase, "webhook");
    const count = await service.upsertVideos(brandId, items, datasetId);

    console.info(`[apify/webhook] Upserted ${count} videos for brand ${brandId}`);
    return NextResponse.json({ ok: true, upserted: count });
  } catch (err) {
    console.error("[apify/webhook] Upsert error:", err);
    // Return 200 — we already have the data, no point retrying upsert on client error
    return NextResponse.json({ ok: true });
  }
}
```

**Note:** The webhook uses `createClient()`. In production, the Apify webhook has no user session, so RLS will block inserts. Switch to `createAdminClient()` from `@/lib/supabase/admin` for the upsert to bypass RLS, while still verifying `brandId` is valid. Update the import and the `createClient()` call to use `createAdminClient()`:

Replace `const supabase = await createClient();` with:
```typescript
import { createAdminClient } from "@/lib/supabase/admin";
// ...
const supabase = createAdminClient();
```

And `const service = new CompetitorVideoService(supabase, "webhook");` stays as-is (userId not used in `upsertVideos`).

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 4: Manual Sync Route

**Files:**
- Create: `src/app/api/video/sync-apify/route.ts`

- [ ] **Step 1: Create the manual sync route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import type { ApifyVideoItem } from "@/services/competitorVideoService";

const APIFY_BASE = "https://api.apify.com/v2";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body = (await request.json()) as { brandId?: string; apifyDatasetId?: string };

    if (!body.brandId || !body.apifyDatasetId) {
      return NextResponse.json(
        { error: "brandId and apifyDatasetId are required" },
        { status: 400 },
      );
    }

    const apifyRes = await fetch(
      `${APIFY_BASE}/datasets/${body.apifyDatasetId}/items?clean=true&format=json`,
      { signal: AbortSignal.timeout(25000) },
    );

    if (!apifyRes.ok) {
      return NextResponse.json({ error: "apify_dataset_fetch_failed" }, { status: 502 });
    }

    const items = (await apifyRes.json()) as ApifyVideoItem[];

    const supabase = await createClient();
    const service = new CompetitorVideoService(supabase, userId);
    const count = await service.upsertVideos(body.brandId, items, body.apifyDatasetId);

    return NextResponse.json({ ok: true, upserted: count });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 5: Sync Button on Competitor Videos Page

**Files:**
- Modify: `src/app/app/video/page.tsx`

- [ ] **Step 1: Add sync mutation and modal state**

At the top of `CompetitorVideosPage` (inside the function body), add:

```typescript
const [showSyncModal, setShowSyncModal] = useState(false);
const [datasetId, setDatasetId] = useState("");
const [syncing, setSyncing] = useState(false);
const [syncMessage, setSyncMessage] = useState<string | null>(null);

async function handleSync() {
  if (!selectedBrandId || !datasetId.trim()) return;
  setSyncing(true);
  setSyncMessage(null);
  try {
    const res = await apiFetch<{ upserted: number }>("/api/video/sync-apify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brandId: selectedBrandId, apifyDatasetId: datasetId.trim() }),
    });
    setSyncMessage(t.video.syncSuccess.replace("{0}", String(res.upserted)));
    await queryClient.invalidateQueries({ queryKey: queryKeys.competitorVideos.list(selectedBrandId) });
    setTimeout(() => { setShowSyncModal(false); setSyncMessage(null); setDatasetId(""); }, 1500);
  } catch {
    setSyncMessage(t.video.syncFailed);
  } finally {
    setSyncing(false);
  }
}
```

Add `useQueryClient` to the imports:
```typescript
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
```

And inside the component body:
```typescript
const queryClient = useQueryClient();
```

- [ ] **Step 2: Add "Sync từ Apify" button next to "+ Add Video"**

Find the header row (inside the `max-w-5xl` div):
```tsx
          {selectedBrandId && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              {t.video.addVideo}
            </button>
          )}
```

Replace with:
```tsx
          {selectedBrandId && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSyncModal(true)}
                className="flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2.5 text-sm font-medium text-foreground-muted hover:bg-white/[0.04]"
              >
                {t.video.syncApify}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-violet-500"
              >
                <Plus className="h-4 w-4" />
                {t.video.addVideo}
              </button>
            </div>
          )}
```

- [ ] **Step 3: Add the Sync modal at the bottom of the page JSX**

After the existing `{showModal && ...}` block, add:
```tsx
      {showSyncModal && selectedBrandId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSyncModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border-strong/30 bg-background-elevated p-6 shadow-2xl"
          >
            <h3 className="mb-4 text-lg font-semibold text-foreground">{t.video.syncApify}</h3>
            <label className="mb-1 block text-sm font-medium text-foreground-muted">
              {t.video.apifyDatasetId}
            </label>
            <input
              type="text"
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              placeholder={t.video.apifyDatasetIdPlaceholder}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
            />
            {syncMessage && (
              <p className="mt-2 text-sm text-foreground-muted">{syncMessage}</p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-foreground-muted hover:text-foreground"
              >
                {t.video.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleSync()}
                disabled={!datasetId.trim() || syncing}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
              >
                {syncing ? t.video.syncing : t.video.syncApify}
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 4: TypeScript check + build**

```
npx tsc --noEmit
npm run build
```

Expected: 0 TypeScript errors, build succeeds.

---

## Implementation Order

Tasks 1 and 2 can be done in parallel.
Task 3 (webhook) depends on Task 1 (upsertVideos).
Task 4 (manual sync route) depends on Task 1.
Task 5 (UI) depends on Tasks 2 and 4.
