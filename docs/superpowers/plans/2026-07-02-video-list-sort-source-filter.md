# Video list sort-by-recency + source filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Trending Videos list (`/app/video`) be sorted by most-recently-crawled (instead of always by view count) and filtered by source (Apify sync vs. manually added), with both choices persisted in the URL like the existing status tab.

**Architecture:** Two new URL query params (`sort`, `source`) flow from `page.tsx` → `useCompetitorVideos` hook → `GET /api/video/competitors` → `CompetitorVideoService.listVideos`, which conditionally changes its `.order()` chain and adds an `apify_run_id` filter. `addVideo` is extended to stamp `scraped_at` at insert time so manually-added videos sort correctly among Apify-synced ones.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (`@supabase/supabase-js` query builder), Vitest, React Query.

## Global Constraints

- No `any`; narrow `unknown` with type guards (CLAUDE.md).
- No type assertions (`as X`) without a comment explaining why it's safe (CLAUDE.md — existing file already follows this; keep the pattern).
- No barrel `index.ts` files; import directly from source files (CLAUDE.md).
- Magic strings/numbers get named constants (CLAUDE.md).
- TDD: write the failing test first for every service/route change; this codebase has no React component tests (`*.test.tsx`) and no hook tests today, so UI-layer tasks (dropdowns, page wiring) are verified via `tsc --noEmit` + the existing test suite, not new component tests — don't introduce a new testing pattern the codebase doesn't already use.
- Vietnamese (`vi.ts`) copy mirrors the tone of existing `video.*` keys; `en.ts` gets the matching English string in the same task.
- Every task ends green: `npx vitest run` and `npx tsc --noEmit -p .` both pass before committing.

---

### Task 1: `VideoSort` / `VideoSource` types + `listVideos` sort & source filtering

**Files:**
- Modify: `src/features/video/types.ts:4` (add two type exports)
- Modify: `src/services/competitorVideoService.ts:34-76` (`listVideos`)
- Test: `src/services/__tests__/competitorVideoService.test.ts` (new `describe` block)

**Interfaces:**
- Produces: `VideoSort = "recent" | "views"`, `VideoSource = "all" | "apify" | "manual"` (exported from `src/features/video/types.ts`, consumed by Task 3's route and Task 4's hook).
- Produces: `CompetitorVideoService.listVideos(brandId: string, status?: VideoStatus, page = 1, limit = 20, q?: string, sort: VideoSort = "recent", source: VideoSource = "all"): Promise<{ videos: CompetitorVideo[]; total: number }>` — two new trailing optional params, both defaulted, so all existing call sites (route, other tests) keep compiling unchanged.

- [ ] **Step 1: Add the two types**

In `src/features/video/types.ts`, right after line 4 (`export type VideoStatus = "pending" | "winner" | "rejected";`):

```ts
export type VideoSort = "recent" | "views";
export type VideoSource = "all" | "apify" | "manual";
```

- [ ] **Step 2: Write the failing tests**

In `src/services/__tests__/competitorVideoService.test.ts`, add this import alongside the existing ones at the top of the file:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
```

(already present — no change needed there). Then add a new `describe` block anywhere after the existing imports (e.g. right before `describe("CompetitorVideoService.bulkUpdateStatus", ...)`):

```ts
describe("CompetitorVideoService.listVideos — sort & source", () => {
  interface RecordedCall {
    method: string;
    args: unknown[];
  }

  function makeListVideosSupabase(result: {
    data: unknown[] | null;
    error: { message: string } | null;
    count: number | null;
  }): { supabase: SupabaseClient; calls: RecordedCall[] } {
    const calls: RecordedCall[] = [];
    const builder = {
      select: (...args: unknown[]) => {
        calls.push({ method: "select", args });
        return builder;
      },
      eq: (...args: unknown[]) => {
        calls.push({ method: "eq", args });
        return builder;
      },
      order: (...args: unknown[]) => {
        calls.push({ method: "order", args });
        return builder;
      },
      range: (...args: unknown[]) => {
        calls.push({ method: "range", args });
        return builder;
      },
      or: (...args: unknown[]) => {
        calls.push({ method: "or", args });
        return builder;
      },
      is: (...args: unknown[]) => {
        calls.push({ method: "is", args });
        return builder;
      },
      not: (...args: unknown[]) => {
        calls.push({ method: "not", args });
        return builder;
      },
      // Safe: real PostgrestFilterBuilder is thenable; this fake mirrors that
      // so `await query` resolves without a real Supabase client.
      then: (resolve: (value: typeof result) => void) => resolve(result),
    };
    const supabase = { from: () => builder } as unknown as SupabaseClient;
    return { supabase, calls };
  }

  it("orders by scraped_at desc by default (sort omitted = 'recent')", async () => {
    const { supabase, calls } = makeListVideosSupabase({ data: [], error: null, count: 0 });
    const service = new CompetitorVideoService(supabase, "user-1");

    await service.listVideos("brand-1");

    const orderCalls = calls.filter((c) => c.method === "order");
    expect(orderCalls[0]).toEqual({ method: "order", args: ["scraped_at", { ascending: false, nullsFirst: false }] });
    expect(orderCalls[1]).toEqual({ method: "order", args: ["created_at", { ascending: false }] });
  });

  it("orders by views desc when sort='views'", async () => {
    const { supabase, calls } = makeListVideosSupabase({ data: [], error: null, count: 0 });
    const service = new CompetitorVideoService(supabase, "user-1");

    await service.listVideos("brand-1", undefined, 1, 20, undefined, "views");

    const orderCalls = calls.filter((c) => c.method === "order");
    expect(orderCalls[0]).toEqual({ method: "order", args: ["views", { ascending: false, nullsFirst: false }] });
    expect(orderCalls[1]).toEqual({ method: "order", args: ["created_at", { ascending: false }] });
  });

  it("filters apify_run_id IS NOT NULL when source='apify'", async () => {
    const { supabase, calls } = makeListVideosSupabase({ data: [], error: null, count: 0 });
    const service = new CompetitorVideoService(supabase, "user-1");

    await service.listVideos("brand-1", undefined, 1, 20, undefined, "recent", "apify");

    expect(calls).toContainEqual({ method: "not", args: ["apify_run_id", "is", null] });
  });

  it("filters apify_run_id IS NULL when source='manual'", async () => {
    const { supabase, calls } = makeListVideosSupabase({ data: [], error: null, count: 0 });
    const service = new CompetitorVideoService(supabase, "user-1");

    await service.listVideos("brand-1", undefined, 1, 20, undefined, "recent", "manual");

    expect(calls).toContainEqual({ method: "is", args: ["apify_run_id", null] });
  });

  it("applies no extra source filter when source='all' (default)", async () => {
    const { supabase, calls } = makeListVideosSupabase({ data: [], error: null, count: 0 });
    const service = new CompetitorVideoService(supabase, "user-1");

    await service.listVideos("brand-1");

    expect(calls.some((c) => c.method === "is" || c.method === "not")).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/services/__tests__/competitorVideoService.test.ts`
Expected: the 5 new tests FAIL — the "recent" default test fails because the current code always orders by `views` first; the source tests fail because no `.is()`/`.not()` call is ever recorded.

- [ ] **Step 4: Implement `listVideos`**

Replace lines 34-76 of `src/services/competitorVideoService.ts` (the whole `listVideos` method) with:

```ts
  async listVideos(
    brandId: string,
    status?: VideoStatus,
    page = 1,
    limit = 20,
    q?: string,
    sort: VideoSort = "recent",
    source: VideoSource = "all",
  ): Promise<{ videos: CompetitorVideo[]; total: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase
      .from("competitor_videos")
      .select(
        `*, transcripts:transcripts!video_id(whisper_status, brand_scripts(generated_audios(id)))`,
        { count: "exact" },
      )
      .eq("brand_id", brandId);

    query =
      sort === "views"
        ? query.order("views", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false })
        : query.order("scraped_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });

    query = query.range(from, to);

    if (status) {
      query = query.eq("status", status);
    }
    if (source === "apify") {
      query = query.not("apify_run_id", "is", null);
    } else if (source === "manual") {
      query = query.is("apify_run_id", null);
    }
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      query = query.or(`tiktok_url.ilike.${like},author_handle.ilike.${like}`);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    // Safe: the select() above requests exactly the columns + embedded
    // transcripts/brand_scripts/generated_audios join shaped as CompetitorVideoRow.
    const rows = (data ?? []) as CompetitorVideoRow[];
    const videos: CompetitorVideo[] = rows.map(({ transcripts, ...video }) => ({
      ...video,
      ...deriveVideoFlags(transcripts),
    }));

    return { videos, total: count ?? 0 };
  }
```

Also update the type-only import at the top of the file (line 2) from:

```ts
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";
```

to:

```ts
import type { CompetitorVideo, VideoStatus, VideoSort, VideoSource } from "@/features/video/types";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/competitorVideoService.test.ts`
Expected: all tests in the file PASS (the 5 new ones plus the pre-existing ones).

- [ ] **Step 6: Commit**

```bash
git add src/features/video/types.ts src/services/competitorVideoService.ts src/services/__tests__/competitorVideoService.test.ts
git commit -m "feat(video): sort by recency and filter by source in listVideos"
```

---

### Task 2: `addVideo` stamps `scraped_at`

**Files:**
- Modify: `src/services/competitorVideoService.ts:78-102` (`addVideo`)
- Test: `src/services/__tests__/competitorVideoService.test.ts` (extend the existing `CompetitorVideoService.addVideo` describe block)

**Interfaces:**
- Consumes: nothing new — `addVideo(brandId: string, tiktokUrl: string): Promise<CompetitorVideo>` keeps its existing signature.
- Produces: inserted row now always includes `scraped_at` (ISO string, "now"), which Task 1's `sort="recent"` ordering relies on to place manually-added videos correctly instead of always sorting last (`nullsFirst: false` pushes `NULL` to the bottom).

- [ ] **Step 1: Write the failing test**

In `src/services/__tests__/competitorVideoService.test.ts`, inside the existing `describe("CompetitorVideoService.addVideo", ...)` block (the one with the `supabaseCapturingInsert` helper), add:

```ts
  it("sets scraped_at to the current time on insert", async () => {
    vi.spyOn(tiktokOembedService, "fetchTikTokOembed").mockResolvedValue(null);

    let insertedRow: Record<string, unknown> | undefined;
    const supabase = supabaseCapturingInsert((row) => {
      insertedRow = row;
    });

    const before = Date.now();
    const service = new CompetitorVideoService(supabase, "user-1");
    await service.addVideo("brand-1", "https://www.tiktok.com/@somehandle/video/123");
    const after = Date.now();

    const scrapedAt = insertedRow?.scraped_at;
    expect(typeof scrapedAt).toBe("string");
    const scrapedAtMs = new Date(scrapedAt as string).getTime();
    expect(scrapedAtMs).toBeGreaterThanOrEqual(before);
    expect(scrapedAtMs).toBeLessThanOrEqual(after);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/competitorVideoService.test.ts -t "sets scraped_at"`
Expected: FAIL — `typeof scrapedAt` is `"undefined"`, not `"string"` (the insert object has no `scraped_at` key today).

- [ ] **Step 3: Implement**

In `src/services/competitorVideoService.ts`, in `addVideo`, the `.insert({...})` object currently is:

```ts
      .insert({
        brand_id: brandId,
        tiktok_url: tiktokUrl,
        video_id: videoId,
        status: "pending",
        scrape_status: "success",
        author_handle: oembed?.authorHandle ?? null,
        cover_url: oembed?.coverUrl ?? null,
      })
```

Add a `scraped_at` field:

```ts
      .insert({
        brand_id: brandId,
        tiktok_url: tiktokUrl,
        video_id: videoId,
        status: "pending",
        scrape_status: "success",
        author_handle: oembed?.authorHandle ?? null,
        cover_url: oembed?.coverUrl ?? null,
        scraped_at: new Date().toISOString(),
      })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/competitorVideoService.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/competitorVideoService.ts src/services/__tests__/competitorVideoService.test.ts
git commit -m "feat(video): stamp scraped_at when a video is added manually"
```

---

### Task 3: API route validates and forwards `sort`/`source`

**Files:**
- Modify: `src/app/api/video/competitors/route.ts:1-35` (`GET`)
- Test: `src/app/api/__tests__/video-competitors.test.ts` (new file)

**Interfaces:**
- Consumes: `VideoSort`, `VideoSource` from `@/features/video/types` (Task 1); `CompetitorVideoService.listVideos(brandId, status, page, limit, q, sort, source)` (Task 1).
- Produces: `GET /api/video/competitors?...&sort=recent|views&source=all|apify|manual` — invalid values return `400`; a valid/omitted value is forwarded to `listVideos` (omitted → service defaults apply).

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/__tests__/video-competitors.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockListVideos } = vi.hoisted(() => ({
  mockListVideos: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "test-user-id" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/services/competitorVideoService", () => ({
  CompetitorVideoService: class {
    listVideos = mockListVideos;
  },
}));

vi.mock("@/services/storageService", () => ({
  StorageService: class {},
}));

import { GET } from "../video/competitors/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockListVideos.mockResolvedValue({ videos: [], total: 0 });
});

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("GET /api/video/competitors — sort & source validation", () => {
  it("rejects an invalid sort value", async () => {
    const res = await GET(makeRequest("http://localhost/api/video/competitors?brandId=brand-1&sort=bogus"));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid source value", async () => {
    const res = await GET(makeRequest("http://localhost/api/video/competitors?brandId=brand-1&source=bogus"));
    expect(res.status).toBe(400);
  });

  it("forwards a valid sort and source to listVideos", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/video/competitors?brandId=brand-1&sort=views&source=manual"),
    );
    expect(res.status).toBe(200);
    expect(mockListVideos).toHaveBeenCalledWith("brand-1", undefined, 1, 20, undefined, "views", "manual");
  });

  it("omits sort/source and lets the service apply its defaults", async () => {
    const res = await GET(makeRequest("http://localhost/api/video/competitors?brandId=brand-1"));
    expect(res.status).toBe(200);
    expect(mockListVideos).toHaveBeenCalledWith("brand-1", undefined, 1, 20, undefined, undefined, undefined);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/__tests__/video-competitors.test.ts`
Expected: FAIL — the invalid-value tests currently return `200` (no validation exists), and the forwarding tests fail because `mockListVideos` is called with only `(brandId, status, page, q)` today (`sort`/`source` aren't read or passed).

- [ ] **Step 3: Implement**

In `src/app/api/video/competitors/route.ts`, replace lines 1-35 with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import { StorageService } from "@/services/storageService";
import type { VideoStatus, VideoSort, VideoSource } from "@/features/video/types";

const VALID_STATUSES: VideoStatus[] = ["pending", "winner", "rejected"];
const VALID_SORTS: VideoSort[] = ["recent", "views"];
const VALID_SOURCES: VideoSource[] = ["all", "apify", "manual"];

const PAGE_LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const status = searchParams.get("status") as VideoStatus | null;
    const sort = searchParams.get("sort") as VideoSort | null;
    const source = searchParams.get("source") as VideoSource | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const q = searchParams.get("q") ?? undefined;

    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (sort && !VALID_SORTS.includes(sort)) {
      return NextResponse.json({ error: "Invalid sort" }, { status: 400 });
    }
    if (source && !VALID_SOURCES.includes(source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new CompetitorVideoService(supabase, userId);
    const { videos, total } = await service.listVideos(
      brandId,
      status ?? undefined,
      page,
      PAGE_LIMIT,
      q,
      sort ?? undefined,
      source ?? undefined,
    );
    return NextResponse.json({ videos, total, page, limit: PAGE_LIMIT });
  } catch (e) {
    return handleApiError(e);
  }
}
```

(The rest of the file — `POST`, `PATCH`, `DELETE` — is unchanged; only the imports and `GET` body change.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/__tests__/video-competitors.test.ts`
Expected: all 4 tests PASS.

- [ ] **Step 5: Run the full suite and commit**

Run: `npx vitest run`
Expected: all test files PASS (including `video-competitors-bulk.test.ts` and `video-competitor-detail.test.ts`, unaffected by this change).

```bash
git add src/app/api/video/competitors/route.ts src/app/api/__tests__/video-competitors.test.ts
git commit -m "feat(video): validate and forward sort/source query params"
```

---

### Task 4: Thread `sort`/`source` through the query key and React Query hook

**Files:**
- Modify: `src/lib/query/keys.ts:34-40` (`competitorVideos.list`)
- Modify: `src/hooks/api/useCompetitorVideos.ts:1-29` (`useCompetitorVideos`)

**Interfaces:**
- Consumes: `VideoSort`, `VideoSource` from `@/features/video/types` (Task 1).
- Produces: `queryKeys.competitorVideos.list(brandId: string, status: string, page: number, q?: string, sort?: VideoSort, source?: VideoSource)`; `useCompetitorVideos(brandId: string | null, status: VideoStatus = "pending", page = 1, q?: string, sort: VideoSort = "recent", source: VideoSource = "all")` — consumed by Task 5's `page.tsx`.

No dedicated test for this task: this codebase has no existing hook tests (verified — `src/hooks/**/__tests__` doesn't exist), and both changes are thin plumbing already exercised end-to-end by Task 3's route tests and Task 5's manual verification. Verify with `tsc --noEmit` only, per the Global Constraints note on not inventing new test patterns.

- [ ] **Step 1: Update the query key**

In `src/lib/query/keys.ts`, replace lines 34-40:

```ts
  competitorVideos: {
    all: (brandId: string) => ["competitor-videos", brandId] as const,
    list: (brandId: string, status: string, page: number, q?: string) =>
      ["competitor-videos", brandId, status, page, q ?? ""] as const,
    detail: (brandId: string, videoId: string) =>
      ["competitor-videos", brandId, "detail", videoId] as const,
  },
```

with:

```ts
  competitorVideos: {
    all: (brandId: string) => ["competitor-videos", brandId] as const,
    list: (brandId: string, status: string, page: number, q?: string, sort?: string, source?: string) =>
      ["competitor-videos", brandId, status, page, q ?? "", sort ?? "", source ?? ""] as const,
    detail: (brandId: string, videoId: string) =>
      ["competitor-videos", brandId, "detail", videoId] as const,
  },
```

- [ ] **Step 2: Update the hook**

In `src/hooks/api/useCompetitorVideos.ts`, update the type-only import (line 4-10) from:

```ts
import type {
  CompetitorVideo,
  CompetitorVideosResponse,
  AddVideoResponse,
  UpdateVideoResponse,
  VideoStatus,
} from "@/features/video/types";
```

to:

```ts
import type {
  CompetitorVideo,
  CompetitorVideosResponse,
  AddVideoResponse,
  UpdateVideoResponse,
  VideoStatus,
  VideoSort,
  VideoSource,
} from "@/features/video/types";
```

Then replace `useCompetitorVideos` (lines 12-29):

```ts
export function useCompetitorVideos(
  brandId: string | null,
  status: VideoStatus = "pending",
  page = 1,
  q?: string,
) {
  return useQuery({
    queryKey: queryKeys.competitorVideos.list(brandId!, status, page, q),
    queryFn: () => {
      const params = new URLSearchParams({ brandId: brandId!, status, page: String(page) });
      if (q && q.trim()) params.set("q", q.trim());
      return apiFetch<CompetitorVideosResponse>(
        `/api/video/competitors?${params.toString()}`,
      );
    },
    enabled: !!brandId,
  });
}
```

with:

```ts
export function useCompetitorVideos(
  brandId: string | null,
  status: VideoStatus = "pending",
  page = 1,
  q?: string,
  sort: VideoSort = "recent",
  source: VideoSource = "all",
) {
  return useQuery({
    queryKey: queryKeys.competitorVideos.list(brandId!, status, page, q, sort, source),
    queryFn: () => {
      const params = new URLSearchParams({ brandId: brandId!, status, page: String(page), sort, source });
      if (q && q.trim()) params.set("q", q.trim());
      return apiFetch<CompetitorVideosResponse>(
        `/api/video/competitors?${params.toString()}`,
      );
    },
    enabled: !!brandId,
  });
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p .`
Expected: no errors. (Existing call site in `src/app/app/video/page.tsx` passes only 4 args today, which still matches the new signature since `sort`/`source` default.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/query/keys.ts src/hooks/api/useCompetitorVideos.ts
git commit -m "feat(video): thread sort/source through query key and hook"
```

---

### Task 5: `VideoStatusFilter` dropdowns + `page.tsx` URL wiring

This task is one unit, not two, even though it touches several files: adding
`sort`/`source` as *required* props to `VideoStatusFilter` without updating
its one call site in the same task would leave `tsc --noEmit` failing between
commits, violating the Global Constraint that every task ends green. So the
component change and its call-site wiring land together.

**Files:**
- Modify: `src/lib/i18n/vi.ts:764` (insert after `searchPlaceholder`)
- Modify: `src/lib/i18n/en.ts:767` (insert after `searchPlaceholder`)
- Modify: `src/features/video/components/VideoStatusFilter.tsx` (whole file)
- Modify: `src/app/app/video/page.tsx` (whole file)

**Interfaces:**
- Consumes: `VideoSort`, `VideoSource` from `@/features/video/types` (Task 1); updated `useCompetitorVideos(brandId, status, page, q, sort, source)` signature (Task 4).
- Produces: `VideoStatusFilterProps` gains `sort: VideoSort`, `onSortChange: (sort: VideoSort) => void`, `source: VideoSource`, `onSourceChange: (source: VideoSource) => void`.

No dedicated test: no component-test convention exists in this codebase (verified — zero `*.test.tsx` files, and no `src/hooks/**/__tests__`). Verify with `tsc --noEmit` + the full test suite + manual dev-server check.

- [ ] **Step 1: Add i18n keys**

In `src/lib/i18n/vi.ts`, right after line 764 (`searchPlaceholder: "Tìm theo URL hoặc tên tác giả...",`), insert:

```ts
    sortRecent: "Mới crawl nhất",
    sortViews: "Lượt xem cao nhất",
    sourceAll: "Tất cả nguồn",
    sourceApify: "Từ Apify",
    sourceManual: "Thêm thủ công",
```

In `src/lib/i18n/en.ts`, right after line 767 (`searchPlaceholder: "Search by URL or author handle...",`), insert:

```ts
    sortRecent: "Recently crawled",
    sortViews: "Most viewed",
    sourceAll: "All sources",
    sourceApify: "From Apify",
    sourceManual: "Manually added",
```

- [ ] **Step 2: Update `VideoStatusFilter`**

Replace the full contents of `src/features/video/components/VideoStatusFilter.tsx` with:

```tsx
// Client Component: status tab filter + search input + sort/source dropdowns
"use client";

import { useT } from "@/lib/i18n/useTranslation";
import { Search } from "lucide-react";
import type { VideoStatus, VideoSort, VideoSource } from "@/features/video/types";

interface VideoStatusFilterProps {
  activeStatus: VideoStatus;
  onStatusChange: (status: VideoStatus) => void;
  search: string;
  onSearchChange: (value: string) => void;
  activeTotal: number;
  sort: VideoSort;
  onSortChange: (sort: VideoSort) => void;
  source: VideoSource;
  onSourceChange: (source: VideoSource) => void;
}

export function VideoStatusFilter({
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
  activeTotal,
  sort,
  onSortChange,
  source,
  onSourceChange,
}: VideoStatusFilterProps) {
  const { t } = useT();

  const tabs: { key: VideoStatus; label: string }[] = [
    { key: "pending", label: t.video.filterPending },
    { key: "winner", label: t.video.filterWinner },
    { key: "rejected", label: t.video.filterRejected },
  ];

  const selectClassName =
    "rounded-lg border border-border/40 bg-background-elevated/30 py-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onStatusChange(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeStatus === tab.key
                ? "bg-primary/10 text-primary"
                : "text-foreground-muted hover:bg-black/[0.04] hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeStatus === tab.key && activeTotal > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                {activeTotal}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.video.searchPlaceholder}
            className="w-full rounded-lg border border-border/40 bg-background-elevated/30 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as VideoSort)}
          className={selectClassName}
        >
          <option value="recent">{t.video.sortRecent}</option>
          <option value="views">{t.video.sortViews}</option>
        </select>
        <select
          value={source}
          onChange={(e) => onSourceChange(e.target.value as VideoSource)}
          className={selectClassName}
        >
          <option value="all">{t.video.sourceAll}</option>
          <option value="apify">{t.video.sourceApify}</option>
          <option value="manual">{t.video.sourceManual}</option>
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add URL state for sort/source in `page.tsx`**

In `src/app/app/video/page.tsx`, update the type-only import on line 22 from:

```ts
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";
```

to:

```ts
import type { CompetitorVideo, VideoStatus, VideoSort, VideoSource } from "@/features/video/types";
```

Right after the existing `activeStatus` derivation (lines 33-37):

```ts
  // The active tab lives in the URL (?status=…) so it survives navigating into a
  // pipeline and back; an unknown/absent value falls back to "pending".
  const statusParam = searchParams.get("status");
  const activeStatus: VideoStatus =
    statusParam === "winner" || statusParam === "rejected" ? statusParam : "pending";
```

add:

```ts
  const sortParam = searchParams.get("sort");
  const activeSort: VideoSort = sortParam === "views" ? "views" : "recent";
  const sourceParam = searchParams.get("source");
  const activeSource: VideoSource =
    sourceParam === "apify" || sourceParam === "manual" ? sourceParam : "all";
```

- [ ] **Step 4: Pass sort/source to the hook**

Update the `useCompetitorVideos` call (lines 53-58) from:

```ts
  const { data, isLoading } = useCompetitorVideos(
    selectedBrandId,
    activeStatus,
    page,
    debouncedSearch || undefined,
  );
```

to:

```ts
  const { data, isLoading } = useCompetitorVideos(
    selectedBrandId,
    activeStatus,
    page,
    debouncedSearch || undefined,
    activeSort,
    activeSource,
  );
```

- [ ] **Step 5: Add change handlers**

Right after `handleStatusChange` (lines 75-83):

```ts
  function handleStatusChange(status: VideoStatus) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("status", status);
    // replace (not push) so switching tabs doesn't stack browser-history entries
    router.replace(`/app/video?${params.toString()}`);
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
  }
```

add:

```ts
  function handleSortChange(sort: VideoSort) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    router.replace(`/app/video?${params.toString()}`);
    setPage(1);
  }

  function handleSourceChange(source: VideoSource) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("source", source);
    router.replace(`/app/video?${params.toString()}`);
    setPage(1);
  }
```

- [ ] **Step 6: Pass new props to `VideoStatusFilter`**

Update the `<VideoStatusFilter>` usage (lines 193-199) from:

```tsx
              <VideoStatusFilter
                activeStatus={activeStatus}
                onStatusChange={handleStatusChange}
                search={search}
                onSearchChange={handleSearchChange}
                activeTotal={total}
              />
```

to:

```tsx
              <VideoStatusFilter
                activeStatus={activeStatus}
                onStatusChange={handleStatusChange}
                search={search}
                onSearchChange={handleSearchChange}
                activeTotal={total}
                sort={activeSort}
                onSortChange={handleSortChange}
                source={activeSource}
                onSourceChange={handleSourceChange}
              />
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

Run: `npx vitest run`
Expected: all test files PASS.

- [ ] **Step 8: Manual verification**

Start the dev server (`npm run dev`), open `/app/video` with a brand selected, and confirm:
- Default load shows "Mới crawl nhất" selected in the sort dropdown.
- Switching to "Lượt xem cao nhất" changes the order and updates the URL (`?sort=views`).
- Switching the source dropdown to "Từ Apify" / "Thêm thủ công" narrows the list and updates the URL (`?source=apify` / `?source=manual`); pagination total reflects the filtered count.
- A freshly-added manual video (via "+ Thêm Video") appears at the top under "Mới crawl nhất".

If browser automation isn't available in the environment, note explicitly that this step wasn't run and ask the user to confirm instead of claiming it was verified.

- [ ] **Step 9: Commit**

```bash
git add src/lib/i18n/vi.ts src/lib/i18n/en.ts src/features/video/components/VideoStatusFilter.tsx src/app/app/video/page.tsx
git commit -m "feat(video): add sort-by-recency and source filter UI to the video list"
```

---

## Self-Review Notes

- **Spec coverage:** URL state + dropdown UI + i18n (Task 5) ✓, backend order/filter logic (Task 1) ✓, `scraped_at` stamping (Task 2) ✓, route validation (Task 3) ✓, hook/query-key threading (Task 4) ✓. Testing plan: Tasks 1-3 have TDD tests; Task 4-5 explicitly documented as following the codebase's existing no-hook-test/no-component-test convention, matching the spec's acknowledgment that final key names and test scope would be locked down during implementation.
- **Placeholder scan:** no TBD/TODO; every step shows complete code.
- **Type consistency:** `VideoSort`/`VideoSource` (Task 1) are the same two types imported verbatim in Tasks 3, 4, 5 — no renaming across tasks. `listVideos`' parameter order (`brandId, status, page, limit, q, sort, source`) matches exactly between Task 1's implementation and Task 3's route test assertion (`toHaveBeenCalledWith("brand-1", undefined, 1, 20, undefined, "views", "manual")`).
- **Green-between-commits check:** re-verified every task's final state compiles and tests pass before its commit step — the earlier draft's Task 5/6 split (committing `VideoStatusFilter.tsx` with new required props before `page.tsx` consumed them) was the one place this didn't hold; fixed by merging into a single task (see note under Task 5's heading).
