# Bulk Video Status Change & Bulk Permanent Delete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bulk "Mark Winner"/"Reject" on the Pending tab and bulk "Delete Permanently" on the Rejected tab of the competitor-video review page, per `docs/superpowers/specs/2026-07-01-bulk-video-actions-design.md`.

**Architecture:** Extend `CompetitorVideoService` with `bulkUpdateStatus`/`bulkDelete`, expose them via new `PATCH`/`DELETE` handlers on the existing `/api/video/competitors` collection route, wrap in two new React Query mutation hooks, and wire a checkbox-selection UI (modeled on `LibraryView.tsx`) into `page.tsx` + `CompetitorVideoCard.tsx`.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + RLS), TanStack React Query, Tailwind CSS, Vitest.

## Global Constraints

- No `any`; use `unknown` + narrowing. Any type assertion (`as X`) must have a comment explaining why it's safe.
- No barrel `index.ts` files — import directly from source files.
- Client Components require a `// Client Component: [reason]` comment above `"use client"` (already present on the files touched here — do not remove).
- Styling is Tailwind utility classes only; no inline `style` objects.
- Bulk status PATCH only accepts `status` = `"winner"` or `"rejected"` (never `"pending"`) — matches the design decision that bulk actions only run from the Pending and Rejected tabs.
- "Select all" only selects the current page (max 20 rows) — never all rows across pagination.
- Permanent delete requires a `window.confirm` before calling the API (matches `ConceptsTab.tsx:56` / `ProductsTab.tsx:58` pattern).
- Run tests with `npx vitest run <path>` (no `--` passthrough script; `npm test` runs the whole suite).
- This codebase currently has zero `.test.tsx` / hook / service-layer tests — API-route tests are the only existing convention (`vi.hoisted` + `vi.mock` for `@/lib/user-context`, `@/lib/supabase/server`, and the service class). Task 1 introduces the first service-layer tests using inline fake Supabase clients (same nested-object-chain style as `src/app/api/__tests__/user-concepts.test.ts`, no shared test-builder abstraction — YAGNI). Tasks 3 and 5 have no automated test (see each task's rationale) and are verified manually.

---

### Task 1: Service layer — `bulkUpdateStatus` and `bulkDelete`

**Files:**
- Modify: `src/services/competitorVideoService.ts`
- Create: `src/services/__tests__/competitorVideoService.test.ts`

**Interfaces:**
- Produces: `CompetitorVideoService.bulkUpdateStatus(videoIds: string[], status: VideoStatus): Promise<number>` — returns count of rows updated.
- Produces: `CompetitorVideoService.bulkDelete(videoIds: string[]): Promise<string[]>` — deletes the videos, returns storage paths (bucket `generated-audio`) of any cascaded `generated_audios` rows that existed before deletion.

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/competitorVideoService.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CompetitorVideoService } from "@/services/competitorVideoService";

describe("CompetitorVideoService.bulkUpdateStatus", () => {
  it("updates all given ids and returns the updated count", async () => {
    const selectResult = { data: [{ id: "v1" }, { id: "v2" }], error: null };
    const supabase = {
      from: () => ({ update: () => ({ in: () => ({ select: () => Promise.resolve(selectResult) }) }) }),
      // Safe: fake only implements the from().update().in().select() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    const updated = await service.bulkUpdateStatus(["v1", "v2"], "winner");

    expect(updated).toBe(2);
  });

  it("throws when the update fails", async () => {
    const selectResult = { data: null, error: { message: "boom" } };
    const supabase = {
      from: () => ({ update: () => ({ in: () => ({ select: () => Promise.resolve(selectResult) }) }) }),
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    await expect(service.bulkUpdateStatus(["v1"], "rejected")).rejects.toThrow("boom");
  });
});

describe("CompetitorVideoService.bulkDelete", () => {
  it("collects storage paths from cascaded generated_audios and deletes the videos", async () => {
    const audioRows = {
      data: [
        { brand_scripts: [{ generated_audios: [{ storage_path: "generated-audio/v1/a.mp3" }] }] },
        { brand_scripts: [{ generated_audios: [] }] },
      ],
      error: null,
    };
    const supabase = {
      from: (table: string) => {
        if (table === "transcripts") {
          return { select: () => ({ in: () => Promise.resolve(audioRows) }) };
        }
        return {
          delete: () => ({
            in: (_col: string, ids: string[]) => {
              expect(ids).toEqual(["v1", "v2"]);
              return Promise.resolve({ error: null });
            },
          }),
        };
      },
      // Safe: fake only implements the from()/select()/in()/delete() chains this method calls.
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    const paths = await service.bulkDelete(["v1", "v2"]);

    expect(paths).toEqual(["generated-audio/v1/a.mp3"]);
  });

  it("returns an empty array when no video has generated audio", async () => {
    const audioRows = { data: [{ brand_scripts: [] }], error: null };
    const supabase = {
      from: (table: string) => {
        if (table === "transcripts") {
          return { select: () => ({ in: () => Promise.resolve(audioRows) }) };
        }
        return { delete: () => ({ in: () => Promise.resolve({ error: null }) }) };
      },
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    const paths = await service.bulkDelete(["v1"]);

    expect(paths).toEqual([]);
  });

  it("throws when the delete fails", async () => {
    const audioRows = { data: [], error: null };
    const supabase = {
      from: (table: string) => {
        if (table === "transcripts") {
          return { select: () => ({ in: () => Promise.resolve(audioRows) }) };
        }
        return { delete: () => ({ in: () => Promise.resolve({ error: { message: "delete failed" } }) }) };
      },
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    await expect(service.bulkDelete(["v1"])).rejects.toThrow("delete failed");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/__tests__/competitorVideoService.test.ts`
Expected: FAIL — `bulkUpdateStatus is not a function` / `bulkDelete is not a function`.

- [ ] **Step 3: Implement the two methods**

In `src/services/competitorVideoService.ts`, add this interface near the top (after `CompetitorVideoRow`, before the `CompetitorVideoService` class):

```ts
interface AudioJoinRow {
  brand_scripts: { generated_audios: { storage_path: string | null }[] }[] | null;
}
```

Add these two methods to the `CompetitorVideoService` class, after `updateStatus` (currently ending at line 108):

```ts
  async bulkUpdateStatus(videoIds: string[], status: VideoStatus): Promise<number> {
    const { data, error } = await this.supabase
      .from("competitor_videos")
      .update({ status })
      .in("id", videoIds)
      .select("id");

    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async bulkDelete(videoIds: string[]): Promise<string[]> {
    // Cascaded generated_audios rows disappear once competitor_videos rows are
    // deleted (ON DELETE CASCADE), so their storage_path must be read first.
    const { data, error: audioError } = await this.supabase
      .from("transcripts")
      .select("brand_scripts(generated_audios(storage_path))")
      .in("video_id", videoIds);

    if (audioError) throw new Error(audioError.message);

    // Safe: shape matches the embedded select() above.
    const audioRows = (data ?? []) as AudioJoinRow[];
    const storagePaths = audioRows
      .flatMap((row) => row.brand_scripts ?? [])
      .flatMap((script) => script.generated_audios ?? [])
      .map((audio) => audio.storage_path)
      .filter((path): path is string => Boolean(path));

    const { error } = await this.supabase
      .from("competitor_videos")
      .delete()
      .in("id", videoIds);

    if (error) throw new Error(error.message);
    return storagePaths;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/competitorVideoService.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/competitorVideoService.ts src/services/__tests__/competitorVideoService.test.ts
git commit -m "feat(video): add bulkUpdateStatus and bulkDelete to CompetitorVideoService"
```

---

### Task 2: API routes — bulk `PATCH` and `DELETE` on `/api/video/competitors`

**Files:**
- Modify: `src/app/api/video/competitors/route.ts`
- Create: `src/app/api/__tests__/video-competitors-bulk.test.ts`

**Interfaces:**
- Consumes: `CompetitorVideoService.bulkUpdateStatus(videoIds, status)`, `CompetitorVideoService.bulkDelete(videoIds)` from Task 1; `StorageService.remove(bucket, paths)` (existing, `src/services/storageService.ts:40-43`).
- Produces: `PATCH /api/video/competitors` body `{ ids: string[], status: "winner" | "rejected" }` → `{ updated: number }`. `DELETE /api/video/competitors` body `{ ids: string[] }` → `{ deleted: number }`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/__tests__/video-competitors-bulk.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockBulkUpdateStatus, mockBulkDelete, mockStorageRemove } = vi.hoisted(() => ({
  mockBulkUpdateStatus: vi.fn(),
  mockBulkDelete: vi.fn(),
  mockStorageRemove: vi.fn(),
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
    bulkUpdateStatus = mockBulkUpdateStatus;
    bulkDelete = mockBulkDelete;
  },
}));

vi.mock("@/services/storageService", () => ({
  StorageService: class {
    remove = mockStorageRemove;
  },
}));

import { PATCH, DELETE } from "../video/competitors/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockStorageRemove.mockResolvedValue(undefined);
});

function makeRequest(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/video/competitors", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/video/competitors (bulk status)", () => {
  it("rejects an empty ids array", async () => {
    const res = await PATCH(makeRequest("PATCH", { ids: [], status: "winner" }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid status", async () => {
    const res = await PATCH(makeRequest("PATCH", { ids: ["v1"], status: "pending" }));
    expect(res.status).toBe(400);
  });

  it("updates the given ids and returns the count", async () => {
    mockBulkUpdateStatus.mockResolvedValue(2);
    const res = await PATCH(makeRequest("PATCH", { ids: ["v1", "v2"], status: "rejected" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updated).toBe(2);
    expect(mockBulkUpdateStatus).toHaveBeenCalledWith(["v1", "v2"], "rejected");
  });
});

describe("DELETE /api/video/competitors (bulk delete)", () => {
  it("rejects an empty ids array", async () => {
    const res = await DELETE(makeRequest("DELETE", { ids: [] }));
    expect(res.status).toBe(400);
  });

  it("deletes videos and cleans up storage paths", async () => {
    mockBulkDelete.mockResolvedValue(["generated-audio/v1/a.mp3"]);
    const res = await DELETE(makeRequest("DELETE", { ids: ["v1"] }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(1);
    expect(mockStorageRemove).toHaveBeenCalledWith("generated-audio", ["generated-audio/v1/a.mp3"]);
  });

  it("skips storage cleanup when no audio files are attached", async () => {
    mockBulkDelete.mockResolvedValue([]);
    await DELETE(makeRequest("DELETE", { ids: ["v1"] }));
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it("still succeeds if storage cleanup fails", async () => {
    mockBulkDelete.mockResolvedValue(["generated-audio/v1/a.mp3"]);
    mockStorageRemove.mockRejectedValue(new Error("storage down"));
    const res = await DELETE(makeRequest("DELETE", { ids: ["v1"] }));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/__tests__/video-competitors-bulk.test.ts`
Expected: FAIL — `PATCH`/`DELETE` are not exported from `../video/competitors/route`.

- [ ] **Step 3: Implement the handlers**

In `src/app/api/video/competitors/route.ts`, add this import at the top (alongside the existing imports):

```ts
import { StorageService } from "@/services/storageService";
```

Append these two exports at the end of the file (after the existing `POST`):

```ts
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { ids, status } = body as Record<string, unknown>;

    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }
    if (status !== "winner" && status !== "rejected") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    // Safe: the guard above already verified `ids` is a non-empty string array.
    const videoIds = ids as string[];

    const supabase = await createClient();
    const service = new CompetitorVideoService(supabase, userId);
    const updated = await service.bulkUpdateStatus(videoIds, status);
    return NextResponse.json({ updated });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { ids } = body as Record<string, unknown>;

    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }
    // Safe: the guard above already verified `ids` is a non-empty string array.
    const videoIds = ids as string[];

    const supabase = await createClient();
    const service = new CompetitorVideoService(supabase, userId);
    const storagePaths = await service.bulkDelete(videoIds);

    if (storagePaths.length > 0) {
      const storage = new StorageService(supabase);
      await storage.remove("generated-audio", storagePaths).catch((err: unknown) => {
        console.warn("[video/bulk-delete] Storage cleanup failed:", err);
      });
    }

    return NextResponse.json({ deleted: videoIds.length });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/__tests__/video-competitors-bulk.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/video/competitors/route.ts src/app/api/__tests__/video-competitors-bulk.test.ts
git commit -m "feat(video): add bulk status PATCH and bulk delete DELETE routes"
```

---

### Task 3: React Query hooks

**Files:**
- Modify: `src/hooks/api/useCompetitorVideos.ts`

**Interfaces:**
- Consumes: `PATCH`/`DELETE /api/video/competitors` from Task 2.
- Produces: `useBulkUpdateVideoStatus(): UseMutationResult` — call `.mutateAsync({ ids: string[], status: "winner" | "rejected", brandId: string })`. `useBulkDeleteVideos(): UseMutationResult` — call `.mutateAsync({ ids: string[], brandId: string })`. Both invalidate `queryKeys.competitorVideos.all(brandId)` on success.

**No automated test for this task.** `useUpdateVideoStatus` (the existing single-video equivalent, lines 46-66 of this file) has no test either — there is no hook-testing convention anywhere in this repo (`src/hooks/api/` has zero test files), and `vitest.config.ts` runs with `environment: "node"` (no jsdom/React Testing Library wiring). These two hooks are thin `apiFetch` + cache-invalidation wrappers with no branching logic of their own — the logic worth testing already lives in Task 2's route tests. They are verified manually in Task 5's browser check instead of introducing a new test-infra convention out of scope for this feature.

- [ ] **Step 1: Add the two hooks**

In `src/hooks/api/useCompetitorVideos.ts`, append after `useUpdateVideoStatus` (currently ending at line 66):

```ts
export function useBulkUpdateVideoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      status,
    }: {
      ids: string[];
      status: "winner" | "rejected";
      brandId: string;
    }) =>
      apiFetch<{ updated: number }>("/api/video/competitors", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids, status }),
      }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.competitorVideos.all(brandId) });
    },
  });
}

export function useBulkDeleteVideos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids }: { ids: string[]; brandId: string }) =>
      apiFetch<{ deleted: number }>("/api/video/competitors", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.competitorVideos.all(brandId) });
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/api/useCompetitorVideos.ts
git commit -m "feat(video): add useBulkUpdateVideoStatus and useBulkDeleteVideos hooks"
```

---

### Task 4: i18n strings

**Files:**
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/en.ts`

**Interfaces:**
- Produces: `t.video.bulkMarkWinner`, `t.video.bulkReject`, `t.video.bulkDeletePermanently`, `t.video.bulkDeleteConfirm`, `t.video.selectAllOnPage` — consumed by Task 5.

- [ ] **Step 1: Add keys to `vi.ts`**

In `src/lib/i18n/vi.ts`, insert after the `reject: "Từ chối",` line (line 767):

```ts
    bulkMarkWinner: "Winner ({0})",
    bulkReject: "Từ chối ({0})",
    bulkDeletePermanently: "Xóa vĩnh viễn ({0})",
    bulkDeleteConfirm: "Xóa vĩnh viễn {0} video đã chọn? Không thể hoàn tác.",
    selectAllOnPage: "Chọn tất cả trang này",
```

- [ ] **Step 2: Add matching keys to `en.ts`**

In `src/lib/i18n/en.ts`, insert after the `reject: "Reject",` line (line 770):

```ts
    bulkMarkWinner: "Winner ({0})",
    bulkReject: "Reject ({0})",
    bulkDeletePermanently: "Delete permanently ({0})",
    bulkDeleteConfirm: "Permanently delete {0} selected videos? This cannot be undone.",
    selectAllOnPage: "Select all on this page",
```

- [ ] **Step 3: Type-check (catches key mismatches between vi.ts and en.ts)**

Run: `npx tsc --noEmit`
Expected: no errors (`en.ts`'s `Dictionary` type, derived from `vi.ts`'s shape in `src/lib/i18n/types.ts:11`, fails to compile if a key is missing on either side).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/vi.ts src/lib/i18n/en.ts
git commit -m "feat(video): add i18n strings for bulk video actions"
```

---

### Task 5: UI — checkbox selection, selection bar, wiring

**Files:**
- Modify: `src/features/video/components/CompetitorVideoCard.tsx`
- Modify: `src/app/app/video/page.tsx`

**Interfaces:**
- Consumes: `useBulkUpdateVideoStatus`, `useBulkDeleteVideos` (Task 3); `t.video.bulkMarkWinner`, `t.video.bulkReject`, `t.video.bulkDeletePermanently`, `t.video.bulkDeleteConfirm`, `t.video.selectAllOnPage` (Task 4).

**No automated test for this task.** There are zero `.test.tsx` files anywhere in this repo and `vitest.config.ts` runs with `environment: "node"`, so component testing (RTL/jsdom) is not an established convention here — introducing one is out of scope for this feature (YAGNI; would require reconfiguring the test environment repo-wide). This task is verified with a manual browser check instead (Step 4 below).

- [ ] **Step 1: Add selection props to `CompetitorVideoCard`**

In `src/features/video/components/CompetitorVideoCard.tsx`, update the props interface (currently lines 18-21):

```ts
interface CompetitorVideoCardProps {
  video: CompetitorVideo;
  onStatusChange: (videoId: string, status: VideoStatus) => Promise<void>;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: (videoId: string) => void;
}
```

Update the component signature (currently line 23):

```ts
export function CompetitorVideoCard({
  video,
  onStatusChange,
  selectable,
  selected,
  onToggleSelect,
}: CompetitorVideoCardProps) {
```

Add a checkbox `<td>` immediately before the thumbnail `<td>` (currently starting at line 49, `{/* Thumbnail */}`):

```tsx
        {/* Select */}
        {selectable && (
          <td className="py-2 pl-4 pr-2 w-8">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(video.id)}
              className="h-4 w-4 rounded border-border/40 accent-primary"
            />
          </td>
        )}

        {/* Thumbnail */}
        <td className="py-2 pr-3 w-12">
```

(Note: the thumbnail `<td>` drops its `pl-4` since the checkbox `<td>` now owns the left padding — when `selectable` is `false`, the thumbnail cell keeps `py-2 pr-3 w-12` without left padding; this matches the Winner tab's existing look since it never renders the checkbox column.)

Since the Winner tab loses the `pl-4` it used to have on the thumbnail cell, restore left padding for that case by changing the thumbnail `<td>` to:

```tsx
        <td className={`py-2 pr-3 w-12 ${selectable ? "" : "pl-4"}`}>
```

- [ ] **Step 2: Wire selection state and bulk actions into `page.tsx`**

In `src/app/app/video/page.tsx`, update the hooks import (currently lines 10-14):

```ts
import {
  useCompetitorVideos,
  useAddCompetitorVideo,
  useUpdateVideoStatus,
  useBulkUpdateVideoStatus,
  useBulkDeleteVideos,
} from "@/hooks/api/useCompetitorVideos";
```

Add state and the bulk mutations after the existing `updateStatus` line (currently line 54):

```ts
  const updateStatus = useUpdateVideoStatus();
  const bulkUpdateStatus = useBulkUpdateVideoStatus();
  const bulkDeleteVideos = useBulkDeleteVideos();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectable = activeStatus !== "winner";

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeStatus, page]);
```

Add selection helpers next to `handleStatusChange`/`handleSearchChange` (after line 66):

```ts
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) =>
      prev.size === filteredVideos.length ? new Set() : new Set(filteredVideos.map((v) => v.id)),
    );
  }

  async function handleBulkStatusChange(status: "winner" | "rejected") {
    if (!selectedBrandId || selectedIds.size === 0) return;
    await bulkUpdateStatus.mutateAsync({ ids: Array.from(selectedIds), status, brandId: selectedBrandId });
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    if (!selectedBrandId || selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(t.video.bulkDeleteConfirm.replace("{0}", String(count)))) return;
    await bulkDeleteVideos.mutateAsync({ ids: Array.from(selectedIds), brandId: selectedBrandId });
    setSelectedIds(new Set());
  }
```

Note: `filteredVideos` is declared later in the render body (`const filteredVideos = videos;`, currently line 98) — move that line up to just above `toggleSelectAllOnPage`'s definition (i.e., right after the `videos`/`total`/`totalPages` block, currently lines 49-51) so it's in scope for these handlers.

Add the selection bar in the JSX, right after the `VideoStatusFilter` block and before the `{/* Video table */}` comment (currently between lines 143 and 145):

```tsx
            {selectable && selectedIds.size > 0 && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <button
                  type="button"
                  onClick={toggleSelectAllOnPage}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t.video.selectAllOnPage}
                </button>
                <span className="text-xs text-foreground-muted">
                  {selectedIds.size} {t.library.selectedCount}
                </span>
                <div className="flex-1" />
                {activeStatus === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleBulkStatusChange("winner")}
                      disabled={bulkUpdateStatus.isPending}
                      className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-500/20 disabled:opacity-50"
                    >
                      {t.video.bulkMarkWinner.replace("{0}", String(selectedIds.size))}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleBulkStatusChange("rejected")}
                      disabled={bulkUpdateStatus.isPending}
                      className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {t.video.bulkReject.replace("{0}", String(selectedIds.size))}
                    </button>
                  </>
                )}
                {activeStatus === "rejected" && (
                  <button
                    type="button"
                    onClick={() => void handleBulkDelete()}
                    disabled={bulkDeleteVideos.isPending}
                    className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    {t.video.bulkDeletePermanently.replace("{0}", String(selectedIds.size))}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1.5 hover:bg-background-elevated rounded-lg transition-colors"
                  title={t.library.clearSelection}
                >
                  <X className="h-4 w-4 text-foreground-subtle" />
                </button>
              </div>
            )}
```

Add the `X` icon to the `lucide-react` import (currently line 5):

```ts
import { ChevronLeft, ChevronRight, Plus, RefreshCw, X } from "lucide-react";
```

Update the table header (currently lines 160-173) to add a checkbox column:

```tsx
                    <tr className="border-b border-border/20 bg-background-subtle">
                      {selectable && (
                        <th className="py-2.5 pl-4 pr-2 w-8">
                          <input
                            type="checkbox"
                            checked={filteredVideos.length > 0 && selectedIds.size === filteredVideos.length}
                            onChange={toggleSelectAllOnPage}
                            className="h-4 w-4 rounded border-border/40 accent-primary"
                          />
                        </th>
                      )}
                      <th className="py-2.5 pr-3 text-xs font-medium text-foreground-subtle" />
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Video</th>
```

(This replaces the old spacer `<th className="py-2.5 pl-4 pr-3 ..." />` — the `pl-4` now lives on the checkbox `<th>` when present, or should be added back to the video-column `<th>`'s spacer when `selectable` is `false`. Simplest: keep a second conditional spacer for the non-selectable case:)

```tsx
                      {!selectable && (
                        <th className="py-2.5 pl-4 pr-3 text-xs font-medium text-foreground-subtle" />
                      )}
```

Place this right after the `{selectable && (...checkbox...)}` block, before the plain `Video` spacer `<th>`.

Update the `CompetitorVideoCard` usage (currently lines 176-182) to pass the new props:

```tsx
                    {filteredVideos.map((video: CompetitorVideo) => (
                      <CompetitorVideoCard
                        key={video.id}
                        video={video}
                        onStatusChange={handleStatusChange2}
                        selectable={selectable}
                        selected={selectedIds.has(video.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/app/video` with a brand that has videos in Pending and Rejected:
1. Pending tab: check 2+ rows → selection bar appears with count. Click "Winner (N)" → rows disappear from Pending, reappear under Winner tab with correct status; selection clears.
2. Pending tab again: select rows → click "Từ chối (N)" → rows move to Rejected tab.
3. Rejected tab: check "Chọn tất cả trang này" → all rows on the page get selected; click again → all deselected.
4. Rejected tab: select 2+ rows → click "Xóa vĩnh viễn (N)" → browser confirm dialog appears with the count; cancel → nothing happens; confirm → rows disappear and do not come back on refresh (permanently deleted, not just hidden).
5. Winner tab: confirm no checkbox column and no selection bar appear at all.
6. Switch tabs while rows are selected → confirm selection resets (no stale bulk bar bleeding into the new tab).

- [ ] **Step 5: Commit**

```bash
git add src/features/video/components/CompetitorVideoCard.tsx src/app/app/video/page.tsx
git commit -m "feat(video): add bulk select UI for status change and permanent delete"
```

---

## Self-Review Notes

- **Spec coverage:** Pending-tab bulk status change → Task 5 (`handleBulkStatusChange`) + Task 2 (`PATCH`) + Task 1 (`bulkUpdateStatus`). Rejected-tab bulk permanent delete with confirm + storage cleanup → Task 5 (`handleBulkDelete`) + Task 2 (`DELETE`) + Task 1 (`bulkDelete`). "Select all = current page only" → `toggleSelectAllOnPage` uses `filteredVideos` (the current page's array), never a cross-page fetch. Winner tab has no bulk UI → `selectable = activeStatus !== "winner"` gates both the checkbox column and the selection bar. i18n → Task 4. All covered.
- **Type consistency:** `bulkUpdateStatus(videoIds: string[], status: VideoStatus)` (Task 1) is called from the route with `status: "winner" | "rejected"` (Task 2) — both compatible since that union is a subset of `VideoStatus`. Hook `useBulkUpdateVideoStatus`'s `status: "winner" | "rejected"` (Task 3) matches what `handleBulkStatusChange` passes (Task 5). `bulkDelete` returns `string[]` consistently used as storage paths in Task 2.
- **No placeholders:** every step has full, runnable code; no "TBD"/"handle errors appropriately" left in.
