# Design: Sort by newest-crawled + filter by source (Apify / manual) on the video list

Date: 2026-07-02

## Problem

The Trending Videos list (`/app/video`) always sorts by `views desc` — there is
no way to see the most recently crawled videos first, and no way to tell apart
(or filter to) videos pulled in by the Apify sync vs. videos added by hand via
"+ Thêm Video".

## Approach

### 1. URL state

Two new query params alongside the existing `?status=`:

- `sort`: `"recent" | "views"`, default `"recent"` (changes the page default —
  today's implicit behavior, "views desc", becomes an explicit opt-in).
- `source`: `"all" | "apify" | "manual"`, default `"all"`.

Read/write the same way `status` already works in
`src/app/app/video/page.tsx`: validated against the allowed values on read,
written via `router.replace` (not `push`) on change. Changing sort or source
resets `page` to 1, same as changing status or search does today.

### 2. Backend

`CompetitorVideoService.listVideos` (`src/services/competitorVideoService.ts`)
gains two new optional parameters, `sort` and `source`:

- `sort === "recent"` (default): `.order("scraped_at", { ascending: false,
  nullsFirst: false }).order("created_at", { ascending: false })`
- `sort === "views"`: keep today's order — `.order("views", { ascending:
  false, nullsFirst: false }).order("created_at", { ascending: false })`
- `source === "apify"`: `.not("apify_run_id", "is", null)`
- `source === "manual"`: `.is("apify_run_id", null)`
- `source === "all"` (default): no extra filter

`GET /api/video/competitors` (`src/app/api/video/competitors/route.ts`) reads
`sort`/`source` from the query string, validates against the allowed value
sets (400 on an invalid value, same pattern as the existing `status` check),
and forwards them to `listVideos`.

`CompetitorVideoService.addVideo` sets `scraped_at: new Date().toISOString()`
on insert (currently omitted, so manually-added rows have `scraped_at IS
NULL`). Without this, manually-added videos would always sort as "oldest"
under `sort=recent` regardless of when they were actually added, since the
tie-break is `nullsFirst: false`.

### 3. Frontend

`VideoStatusFilter` (`src/features/video/components/VideoStatusFilter.tsx`)
gains two props, `sort`/`onSortChange` and `source`/`onSourceChange`, rendered
as two native `<select>` dropdowns on the same row as the search input (search
input stays `flex-1`, dropdowns are fixed-width to its right):

- Sort: "Lượt xem cao nhất" / "Mới crawl nhất"
- Source: "Tất cả nguồn" / "Từ Apify" / "Thêm thủ công"

`src/app/app/video/page.tsx` owns `sort`/`source` as URL-derived state
(same shape as `activeStatus`), passes them to `VideoStatusFilter` and to
`useCompetitorVideos`.

`useCompetitorVideos` (`src/hooks/api/useCompetitorVideos.ts`) and its query
key (`src/lib/query/keys.ts`) take `sort`/`source` as additional params so
each combination is cached independently, and forwards them as query-string
params to the API call.

New i18n keys in `src/lib/i18n/{vi,en}.ts`: `video.sortRecent` ("Mới crawl
nhất" / "Recently crawled"), `video.sortViews` ("Lượt xem cao nhất" / "Most
viewed"), `video.sourceAll` ("Tất cả nguồn" / "All sources"),
`video.sourceApify` ("Từ Apify" / "From Apify"), `video.sourceManual` ("Thêm
thủ công" / "Manually added"). The two `<select>` elements are
self-explanatory from their selected option text, so no separate
label/legend key is needed (consistent with the existing search input, which
has a placeholder but no visible label).

### 4. Testing (TDD)

- `competitorVideoService.test.ts`: extend with a fake query-builder (records
  each chained call: `.order()`, `.is()`, `.not()`, `.eq()`) to assert
  `listVideos` builds the right chain for each `sort` × `source` combination.
- Same file: `addVideo` sets `scraped_at` to a value close to "now" on insert.
- New route test file `src/app/api/__tests__/video-competitors.test.ts`
  (there is currently no test file for the base `GET`/`POST`
  `/api/video/competitors` route — `video-competitors-bulk.test.ts` only
  covers `PATCH`/`DELETE`): invalid `sort`/`source` query values return 400.

## Scope of changes

- Edit: `src/services/competitorVideoService.ts` (`listVideos`, `addVideo`)
- Edit: `src/app/api/video/competitors/route.ts` (GET query validation)
- Edit: `src/hooks/api/useCompetitorVideos.ts`, `src/lib/query/keys.ts`
- Edit: `src/features/video/components/VideoStatusFilter.tsx`
- Edit: `src/app/app/video/page.tsx`
- Edit: `src/lib/i18n/vi.ts`, `src/lib/i18n/en.ts`
- Test: `src/services/__tests__/competitorVideoService.test.ts` (extended)
- Test: new/extended route test for query-param validation

Out of scope: no DB migration needed (`apify_run_id` and `scraped_at` already
exist on `competitor_videos`); no change to the Apify sync path
(`upsertVideos` already sets `scraped_at` from the scrape).

## Verification

- Default page load shows "Mới crawl nhất" selected, most-recently-crawled
  video first (including a freshly manually-added one).
- Switching sort to "Lượt xem cao nhất" restores today's view-count order.
- Source dropdown correctly narrows the list to only-Apify or only-manual
  rows; totals/pagination reflect the filtered count.
- Combining `status=pending&sort=recent&source=manual` (and other
  combinations) returns correct, correctly-paginated results.
- `tsc --noEmit` passes; `npx vitest run` passes.
