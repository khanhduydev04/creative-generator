# Design: App breadcrumb header + video-tab persistence

Date: 2026-07-02

## Problem

1. On the Trending Videos list (`/app/video`), the active status tab
   (`pending` / `winner` / `rejected`) is stored in React state
   (`useState("pending")`). Navigating into a video pipeline and pressing back
   re-mounts the list and resets the tab to `pending` — the user loses their
   place (e.g. always dropped back onto "chờ duyệt" instead of "winner").
2. There is no desktop header/breadcrumb anywhere in the app (only a mobile top
   bar). The user wants an ElevenLabs-style breadcrumb bar, with a clickable
   parent crumb that returns to the correct list tab.

## Approach

### 1. Persist the list tab in the URL

`src/app/app/video/page.tsx`: replace the `activeStatus` React state with a
URL-query-param source of truth (`?status=winner`).

- Read: `useSearchParams().get("status")`, validated against the three
  `VideoStatus` values, defaulting to `pending`.
- Write: `handleStatusChange` calls `router.replace('/app/video?status=…')`
  (replace, not push, so switching tabs doesn't spam browser history).
- Effect: browser-back from the pipeline naturally returns to
  `/app/video?status=winner`, which renders the winner tab.
- `useSearchParams` requires a Suspense boundary, so the page body moves into an
  inner component wrapped by `<Suspense>` in the default export — the same
  pattern already used by `src/app/login/page.tsx` around `LoginForm`.
- `page` and `search` remain local state (out of scope; the user only reported
  the tab problem).

### 2. Reusable Breadcrumb component

New `src/components/layout/Breadcrumb.tsx`:

```ts
export interface BreadcrumbItem { label: string; href?: string; }
```

Renders `A › B › C` (chevron separators). Items with `href` (and not the last
item) render as `next/link`; the last item is bold plain text (current page).
Renders `null` for an empty list.

### 3. Global desktop header in DashboardLayout

`src/components/layout/DashboardLayout.tsx`:

- Add an optional `breadcrumb?: BreadcrumbItem[]` prop.
- Restructure the existing top bar (currently `lg:hidden`) into an
  always-visible header: hamburger stays mobile-only (`lg:hidden`), the user
  menu stays mobile-only (desktop already shows the user in the sidebar), and
  `<Breadcrumb>` sits between them, visible on all breakpoints.
- Fallback: when a page does not pass `breadcrumb`, derive a single crumb from
  `activePath` by matching against the existing `NAV_SECTIONS` item labels (plus
  the account-area paths). So every page gets a header title with no per-page
  edits.

### 4. Pipeline detail breadcrumb

`src/app/app/video/[id]/page.tsx`: pass an explicit breadcrumb:

```
[{ label: t.nav.competitorVideos, href: "/app/video?status=winner" },
 { label: video.author_handle ? `@${author_handle}` : t.video.pipelineCrumb }]
```

The parent crumb is hardcoded to `?status=winner` because the "Mở pipeline"
button only renders for `winner` videos (`CompetitorVideoCard`), so the pipeline
is only reachable from the winner tab. Documented with a comment; if that rule
changes, thread the origin via a `?from` query param instead.

### 5. i18n

Add `video.pipelineCrumb` ("Chi tiết video" / "Video detail") to `vi.ts` and
`en.ts` as the fallback child-crumb label when a video has no author handle.

## Scope of changes

- New: `src/components/layout/Breadcrumb.tsx`
- Edit: `DashboardLayout.tsx` (prop + header restructure + fallback)
- Edit: `src/app/app/video/page.tsx` (URL tab + Suspense wrapper)
- Edit: `src/app/app/video/[id]/page.tsx` (breadcrumb prop, all render paths)
- Edit: `src/lib/i18n/{vi,en}.ts` (one key)

`CompetitorVideoCard.tsx` is unchanged. Other pages are unchanged (fallback
breadcrumb covers them).

## Verification

- Winner tab → open pipeline → browser-back → lands on winner tab.
- Pipeline breadcrumb "Video Trending" click → winner tab.
- Other app pages show their title in the new desktop header.
- `tsc --noEmit` passes.
