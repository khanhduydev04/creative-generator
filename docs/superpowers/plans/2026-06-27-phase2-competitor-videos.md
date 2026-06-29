# Phase 2: Competitor Videos Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Competitor Videos dashboard at `/app/video` — video grid with status filtering, inline TikTok/CDN video preview, Winner/Reject actions, and manual URL entry modal.

**Architecture:** Layer 3 (Tools) handles data via `CompetitorVideoService`. Layer 2 (Navigation) has the page + Client Components for interactivity. API routes follow the existing `requireUser` + `handleApiError` pattern. Data fetching via TanStack Query hooks.

**Tech Stack:** Next.js App Router, Supabase, TanStack Query, Tailwind CSS, TypeScript, lucide-react

---

## File Map

**Create:**
- `src/features/video/types.ts` — shared types for video module
- `src/services/competitorVideoService.ts` — Supabase data access
- `src/app/api/video/competitors/route.ts` — GET list + POST add
- `src/app/api/video/competitors/[id]/route.ts` — PATCH status
- `src/app/api/video/competitors/[id]/fetch-cdn/route.ts` — tikwm CDN proxy
- `src/hooks/api/useCompetitorVideos.ts` — TanStack Query hooks
- `src/features/video/components/VideoPlayer.tsx` — embed + CDN fallback
- `src/features/video/components/CompetitorVideoCard.tsx` — card UI
- `src/features/video/components/AddVideoModal.tsx` — manual URL modal
- `src/features/video/components/VideoStatusFilter.tsx` — filter tabs

**Modify:**
- `src/lib/i18n/vi.ts` — add `video` section
- `src/lib/i18n/en.ts` — add `video` section (same shape)
- `src/lib/query/keys.ts` — add `competitorVideos` keys
- `src/app/app/video/page.tsx` — replace placeholder with full implementation

---

## Task 1: i18n strings + query keys

**Files:**
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/query/keys.ts`

- [ ] **Step 1: Add `video` section to vi.ts**

Inside `src/lib/i18n/vi.ts`, after the `admin: { ... }` block and before the closing `} as const`, add:

```typescript
  video: {
    pageTitle: "Video Đối Thủ",
    addVideo: "Thêm Video",
    addVideoModalTitle: "Thêm URL TikTok",
    tiktokUrlLabel: "URL TikTok",
    tiktokUrlPlaceholder: "https://www.tiktok.com/@handle/video/...",
    invalidUrl: "URL TikTok không hợp lệ",
    urlAlreadyExists: "URL này đã tồn tại",
    adding: "Đang thêm...",
    add: "Thêm",
    cancel: "Hủy",
    filterAll: "Tất cả",
    filterPending: "Chờ duyệt",
    filterWinner: "Winner",
    filterRejected: "Đã từ chối",
    searchPlaceholder: "Tìm theo URL hoặc tên tác giả...",
    preview: "Xem",
    markWinner: "Winner",
    reject: "Từ chối",
    openTikTok: "Mở TikTok",
    loadingCdn: "Đang tải video...",
    cdnFailed: "Không tải được video, thử mở TikTok.",
    statusPending: "Chờ duyệt",
    statusWinner: "Winner",
    statusRejected: "Từ chối",
    views: "lượt xem",
    likes: "thích",
    noVideos: "Chưa có video nào.",
    noVideosHint: "Bấm \"Thêm Video\" để thêm URL TikTok hoặc đợi Apify đồng bộ.",
    noBrandSelected: "Chọn thương hiệu để xem video.",
    embedBlocked: "Embed bị chặn (TikTok Shop). Đang tải CDN...",
  },
```

- [ ] **Step 2: Add `video` section to en.ts**

Same keys, English values:

```typescript
  video: {
    pageTitle: "Competitor Videos",
    addVideo: "Add Video",
    addVideoModalTitle: "Add TikTok URL",
    tiktokUrlLabel: "TikTok URL",
    tiktokUrlPlaceholder: "https://www.tiktok.com/@handle/video/...",
    invalidUrl: "Invalid TikTok URL",
    urlAlreadyExists: "This URL already exists",
    adding: "Adding...",
    add: "Add",
    cancel: "Cancel",
    filterAll: "All",
    filterPending: "Pending",
    filterWinner: "Winner",
    filterRejected: "Rejected",
    searchPlaceholder: "Search by URL or author handle...",
    preview: "Preview",
    markWinner: "Winner",
    reject: "Reject",
    openTikTok: "Open TikTok",
    loadingCdn: "Loading video...",
    cdnFailed: "Failed to load video, try opening TikTok.",
    statusPending: "Pending",
    statusWinner: "Winner",
    statusRejected: "Rejected",
    views: "views",
    likes: "likes",
    noVideos: "No videos yet.",
    noVideosHint: "Click \"Add Video\" to add a TikTok URL or wait for Apify to sync.",
    noBrandSelected: "Select a brand to view videos.",
    embedBlocked: "Embed blocked (TikTok Shop). Loading CDN...",
  },
```

- [ ] **Step 3: Add competitorVideos keys to query/keys.ts**

In `src/lib/query/keys.ts`, inside the `queryKeys` object (after `admin`), add:

```typescript
  competitorVideos: {
    list: (brandId: string, status?: string) =>
      status
        ? (["competitor-videos", brandId, status] as const)
        : (["competitor-videos", brandId] as const),
  },
```

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 2: Types file

**Files:**
- Create: `src/features/video/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
export type VideoStatus = "pending" | "winner" | "rejected";
export type ScrapeStatus = "success" | "failed";

export interface CompetitorVideo {
  id: string;
  brand_id: string;
  tiktok_url: string;
  video_id: string | null;
  views: number | null;
  likes: number | null;
  shares: number | null;
  comments: number | null;
  author_handle: string | null;
  cover_url: string | null;
  scraped_at: string | null;
  apify_run_id: string | null;
  status: VideoStatus;
  scrape_status: ScrapeStatus;
  created_at: string;
}

export interface AddVideoPayload {
  brandId: string;
  tiktokUrl: string;
}

export interface UpdateVideoStatusPayload {
  status: VideoStatus;
}

export interface FetchCdnResponse {
  cdnUrl: string | null;
}

export interface CompetitorVideosResponse {
  videos: CompetitorVideo[];
}

export interface AddVideoResponse {
  video: CompetitorVideo;
}

export interface UpdateVideoResponse {
  video: CompetitorVideo;
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 3: CompetitorVideoService + API routes

**Files:**
- Create: `src/services/competitorVideoService.ts`
- Create: `src/app/api/video/competitors/route.ts`
- Create: `src/app/api/video/competitors/[id]/route.ts`
- Create: `src/app/api/video/competitors/[id]/fetch-cdn/route.ts`

- [ ] **Step 1: Create service**

`src/services/competitorVideoService.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";

export class CompetitorVideoService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  async listVideos(brandId: string, status?: VideoStatus): Promise<CompetitorVideo[]> {
    let query = this.supabase
      .from("competitor_videos")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as CompetitorVideo[];
  }

  async addVideo(brandId: string, tiktokUrl: string): Promise<CompetitorVideo> {
    const videoId = extractTikTokVideoId(tiktokUrl);
    const { data, error } = await this.supabase
      .from("competitor_videos")
      .insert({
        brand_id: brandId,
        tiktok_url: tiktokUrl,
        video_id: videoId,
        status: "pending",
        scrape_status: "success",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("URL_EXISTS");
      throw new Error(error.message);
    }
    return data as CompetitorVideo;
  }

  async updateStatus(videoId: string, status: VideoStatus): Promise<CompetitorVideo> {
    const { data, error } = await this.supabase
      .from("competitor_videos")
      .update({ status })
      .eq("id", videoId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as CompetitorVideo;
  }
}

function extractTikTokVideoId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}
```

- [ ] **Step 2: Create GET/POST route**

`src/app/api/video/competitors/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import type { VideoStatus } from "@/features/video/types";

const VALID_STATUSES: VideoStatus[] = ["pending", "winner", "rejected"];

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const status = searchParams.get("status") as VideoStatus | null;

    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new CompetitorVideoService(supabase, userId);
    const videos = await service.listVideos(brandId, status ?? undefined);
    return NextResponse.json({ videos });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { brandId, tiktokUrl } = body as Record<string, unknown>;

    if (typeof brandId !== "string" || !brandId.trim()) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }
    if (typeof tiktokUrl !== "string" || !tiktokUrl.includes("tiktok.com")) {
      return NextResponse.json({ error: "Invalid TikTok URL" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new CompetitorVideoService(supabase, userId);
    try {
      const video = await service.addVideo(brandId.trim(), tiktokUrl.trim());
      return NextResponse.json({ video }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === "URL_EXISTS") {
        return NextResponse.json({ error: "URL already exists for this brand" }, { status: 409 });
      }
      throw err;
    }
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: Create PATCH route**

`src/app/api/video/competitors/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import type { VideoStatus } from "@/features/video/types";

const VALID_STATUSES: VideoStatus[] = ["pending", "winner", "rejected"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser(request);
    const { id } = await params;
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { status } = body as Record<string, unknown>;

    if (typeof status !== "string" || !VALID_STATUSES.includes(status as VideoStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new CompetitorVideoService(supabase, userId);
    const video = await service.updateStatus(id, status as VideoStatus);
    return NextResponse.json({ video });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 4: Create fetch-cdn route**

`src/app/api/video/competitors/[id]/fetch-cdn/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;

    const supabase = await createClient();
    const { data: video, error } = await supabase
      .from("competitor_videos")
      .select("tiktok_url")
      .eq("id", id)
      .single();

    if (error || !video) {
      return NextResponse.json({ cdnUrl: null });
    }

    const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(video.tiktok_url)}&hd=0`;
    const res = await fetch(tikwmUrl, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      return NextResponse.json({ cdnUrl: null });
    }

    const tikwmData = await res.json() as { code?: number; data?: { play?: string } };

    if (tikwmData.code !== 0 || !tikwmData.data?.play) {
      return NextResponse.json({ cdnUrl: null });
    }

    return NextResponse.json({ cdnUrl: tikwmData.data.play });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 5: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 4: TanStack Query hooks

**Files:**
- Create: `src/hooks/api/useCompetitorVideos.ts`

- [ ] **Step 1: Create the hooks file**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type {
  CompetitorVideo,
  CompetitorVideosResponse,
  AddVideoResponse,
  UpdateVideoResponse,
  VideoStatus,
} from "@/features/video/types";

export function useCompetitorVideos(brandId: string | null, status?: VideoStatus) {
  return useQuery({
    queryKey: queryKeys.competitorVideos.list(brandId!, status),
    queryFn: () => {
      const params = new URLSearchParams({ brandId: brandId! });
      if (status) params.set("status", status);
      return apiFetch<CompetitorVideosResponse>(
        `/api/video/competitors?${params.toString()}`,
      );
    },
    enabled: !!brandId,
    select: (data) => data.videos,
  });
}

export function useAddCompetitorVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brandId, tiktokUrl }: { brandId: string; tiktokUrl: string }) =>
      apiFetch<AddVideoResponse>("/api/video/competitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId, tiktokUrl }),
      }),
    onSuccess: (_data, { brandId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.competitorVideos.list(brandId),
      });
    },
  });
}

export function useUpdateVideoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ videoId, status }: { videoId: string; status: VideoStatus; brandId: string }) =>
      apiFetch<UpdateVideoResponse>(`/api/video/competitors/${videoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_data, { brandId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.competitorVideos.list(brandId),
      });
    },
  });
}

export function useFetchCdn(videoId: string | null) {
  return useQuery({
    queryKey: ["competitor-cdn", videoId],
    queryFn: () =>
      apiFetch<{ cdnUrl: string | null }>(
        `/api/video/competitors/${videoId}/fetch-cdn`,
      ),
    enabled: false, // only triggered manually via refetch()
    retry: false,
    staleTime: 0,
  });
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 5: VideoPlayer component

**Files:**
- Create: `src/features/video/components/VideoPlayer.tsx`

The component tries TikTok official embed first. If the `<iframe>` fires an error event (TikTok Shop blocks), it calls the CDN fallback endpoint and shows a `<video>` tag. Always shows an "Open TikTok" link as escape hatch.

- [ ] **Step 1: Create VideoPlayer.tsx**

```typescript
// Client Component: iframe embed with CDN video fallback on load error
"use client";

import { useState, useCallback } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n/useTranslation";

type PlayerState = "embed" | "loading-cdn" | "cdn" | "failed";

interface VideoPlayerProps {
  videoId: string | null;
  tiktokUrl: string;
  fetchCdnPath: string; // e.g. /api/video/competitors/{id}/fetch-cdn
}

export function VideoPlayer({ videoId, tiktokUrl, fetchCdnPath }: VideoPlayerProps) {
  const { t } = useT();
  const [state, setState] = useState<PlayerState>(videoId ? "embed" : "loading-cdn");
  const [cdnUrl, setCdnUrl] = useState<string | null>(null);

  const loadCdn = useCallback(async () => {
    setState("loading-cdn");
    try {
      const res = await apiFetch<{ cdnUrl: string | null }>(fetchCdnPath);
      if (res.cdnUrl) {
        setCdnUrl(res.cdnUrl);
        setState("cdn");
      } else {
        setState("failed");
      }
    } catch {
      setState("failed");
    }
  }, [fetchCdnPath]);

  if (state === "embed" && videoId) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingBottom: "177.78%" }}>
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          onError={() => void loadCdn()}
          title="TikTok video"
        />
        <a
          href={tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs text-white hover:bg-black/90"
        >
          <ExternalLink className="h-3 w-3" />
          {t.video.openTikTok}
        </a>
      </div>
    );
  }

  if (state === "loading-cdn" && !cdnUrl) {
    void loadCdn();
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-xl bg-background-elevated">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
        <span className="ml-2 text-sm text-foreground-muted">{t.video.loadingCdn}</span>
      </div>
    );
  }

  if (state === "cdn" && cdnUrl) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingBottom: "177.78%" }}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={cdnUrl}
          controls
          className="absolute inset-0 h-full w-full object-contain"
        />
        <a
          href={tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs text-white hover:bg-black/90"
        >
          <ExternalLink className="h-3 w-3" />
          {t.video.openTikTok}
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl bg-background-elevated text-center">
      <p className="text-sm text-foreground-muted">{t.video.cdnFailed}</p>
      <a
        href={tiktokUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500"
      >
        <ExternalLink className="h-4 w-4" />
        {t.video.openTikTok}
      </a>
    </div>
  );
}
```

**Note:** The `loadCdn` side-effect in the render path (`void loadCdn()` inside the `loading-cdn` branch) runs once on first render when CDN fetch is needed (no videoId). This is intentional — the state update stops it from re-firing.

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 6: VideoStatusFilter component

**Files:**
- Create: `src/features/video/components/VideoStatusFilter.tsx`

- [ ] **Step 1: Create VideoStatusFilter.tsx**

```typescript
// Client Component: status tab filter + search input
"use client";

import { useT } from "@/lib/i18n/useTranslation";
import { Search } from "lucide-react";
import type { VideoStatus } from "@/features/video/types";

type FilterStatus = VideoStatus | "all";

interface VideoStatusFilterProps {
  activeStatus: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
  search: string;
  onSearchChange: (value: string) => void;
  counts: Record<FilterStatus, number>;
}

export function VideoStatusFilter({
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
  counts,
}: VideoStatusFilterProps) {
  const { t } = useT();

  const tabs: { key: FilterStatus; label: string }[] = [
    { key: "all", label: t.video.filterAll },
    { key: "pending", label: t.video.filterPending },
    { key: "winner", label: t.video.filterWinner },
    { key: "rejected", label: t.video.filterRejected },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onStatusChange(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeStatus === tab.key
                ? "bg-primary/10 text-primary"
                : "text-foreground-muted hover:bg-white/[0.04] hover:text-foreground"
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  activeStatus === tab.key
                    ? "bg-primary/20 text-primary"
                    : "bg-background-elevated text-foreground-subtle"
                }`}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.video.searchPlaceholder}
          className="w-full rounded-lg border border-border/40 bg-background-elevated/30 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 7: CompetitorVideoCard component

**Files:**
- Create: `src/features/video/components/CompetitorVideoCard.tsx`

- [ ] **Step 1: Create CompetitorVideoCard.tsx**

```typescript
// Client Component: video card with preview, winner, reject actions
"use client";

import { useState } from "react";
import { Eye, Trophy, XCircle, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { VideoPlayer } from "@/features/video/components/VideoPlayer";
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";

const STATUS_BADGE: Record<VideoStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  winner: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
};

interface CompetitorVideoCardProps {
  video: CompetitorVideo;
  onStatusChange: (videoId: string, status: VideoStatus) => Promise<void>;
}

export function CompetitorVideoCard({ video, onStatusChange }: CompetitorVideoCardProps) {
  const { t } = useT();
  const [showPreview, setShowPreview] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function handleStatusChange(status: VideoStatus) {
    setUpdating(true);
    try {
      await onStatusChange(video.id, status);
    } finally {
      setUpdating(false);
    }
  }

  const statusLabel: Record<VideoStatus, string> = {
    pending: t.video.statusPending,
    winner: t.video.statusWinner,
    rejected: t.video.statusRejected,
  };

  return (
    <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-4 transition-colors hover:bg-background-elevated/30">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-background-elevated">
          {video.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.cover_url}
              alt={video.author_handle ?? "video"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground-subtle text-xs">
              No cover
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {video.author_handle ? `@${video.author_handle}` : video.tiktok_url}
              </p>
              <p className="mt-0.5 text-xs text-foreground-subtle">
                {video.views != null && (
                  <span>{video.views.toLocaleString()} {t.video.views}</span>
                )}
                {video.likes != null && (
                  <span className="ml-2">{video.likes.toLocaleString()} {t.video.likes}</span>
                )}
                {video.scraped_at && (
                  <span className="ml-2">
                    {new Date(video.scraped_at).toLocaleDateString("vi-VN")}
                  </span>
                )}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[video.status]}`}>
              {statusLabel[video.status]}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-white/[0.04] hover:text-foreground"
            >
              <Eye className="h-3.5 w-3.5" />
              {t.video.preview}
            </button>

            {video.status !== "winner" && (
              <button
                type="button"
                onClick={() => void handleStatusChange("winner")}
                disabled={updating}
                className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50"
              >
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />}
                {t.video.markWinner}
              </button>
            )}

            {video.status !== "rejected" && (
              <button
                type="button"
                onClick={() => void handleStatusChange("rejected")}
                disabled={updating}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                {t.video.reject}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline preview */}
      {showPreview && (
        <div className="mt-4 max-w-xs">
          <VideoPlayer
            videoId={video.video_id}
            tiktokUrl={video.tiktok_url}
            fetchCdnPath={`/api/video/competitors/${video.id}/fetch-cdn`}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 8: AddVideoModal component

**Files:**
- Create: `src/features/video/components/AddVideoModal.tsx`

- [ ] **Step 1: Create AddVideoModal.tsx**

```typescript
// Client Component: modal to add TikTok URL manually
"use client";

import { useState, useRef, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { ApiError } from "@/lib/api";

interface AddVideoModalProps {
  brandId: string;
  onClose: () => void;
  onAdd: (tiktokUrl: string) => Promise<void>;
}

function isValidTikTokUrl(url: string): boolean {
  return url.includes("tiktok.com") && url.startsWith("http");
}

export function AddVideoModal({ brandId: _brandId, onClose, onAdd }: AddVideoModalProps) {
  const { t } = useT();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidTikTokUrl(url.trim())) {
      setError(t.video.invalidUrl);
      return;
    }

    setAdding(true);
    try {
      await onAdd(url.trim());
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t.video.urlAlreadyExists);
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border-strong/30 bg-background-elevated p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">{t.video.addVideoModalTitle}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-1 block text-sm font-medium text-foreground-muted">
          {t.video.tiktokUrlLabel}
        </label>
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.video.tiktokUrlPlaceholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {error && (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-foreground-muted hover:text-foreground"
          >
            {t.video.cancel}
          </button>
          <button
            type="submit"
            disabled={!url.trim() || adding}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
          >
            {adding && <Loader2 className="h-4 w-4 animate-spin" />}
            {adding ? t.video.adding : t.video.add}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 9: Implement /app/video page

**Files:**
- Modify: `src/app/app/video/page.tsx`

This is the main page combining all components. It must be a Client Component (uses state for filter/search/modal). The `DashboardLayout` is already Client, so the page itself also needs to be Client.

- [ ] **Step 1: Replace placeholder with full implementation**

```typescript
// Client Component: competitor videos page uses state for filtering, search, and modal
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApp } from "@/features/app/context";
import { useT } from "@/lib/i18n/useTranslation";
import {
  useCompetitorVideos,
  useAddCompetitorVideo,
  useUpdateVideoStatus,
} from "@/hooks/api/useCompetitorVideos";
import { VideoStatusFilter } from "@/features/video/components/VideoStatusFilter";
import { CompetitorVideoCard } from "@/features/video/components/CompetitorVideoCard";
import { AddVideoModal } from "@/features/video/components/AddVideoModal";
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";

type FilterStatus = VideoStatus | "all";

export default function CompetitorVideosPage() {
  const { t } = useT();
  const { selectedBrandId } = useApp();
  const [activeStatus, setActiveStatus] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data: videos = [], isLoading } = useCompetitorVideos(selectedBrandId);
  const addVideo = useAddCompetitorVideo();
  const updateStatus = useUpdateVideoStatus();

  async function handleAddVideo(tiktokUrl: string) {
    if (!selectedBrandId) return;
    await addVideo.mutateAsync({ brandId: selectedBrandId, tiktokUrl });
  }

  async function handleStatusChange(videoId: string, status: VideoStatus) {
    if (!selectedBrandId) return;
    await updateStatus.mutateAsync({ videoId, status, brandId: selectedBrandId });
  }

  const filteredVideos = videos.filter((v: CompetitorVideo) => {
    if (activeStatus !== "all" && v.status !== activeStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        v.tiktok_url.toLowerCase().includes(q) ||
        (v.author_handle?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const counts: Record<FilterStatus, number> = {
    all: videos.length,
    pending: videos.filter((v: CompetitorVideo) => v.status === "pending").length,
    winner: videos.filter((v: CompetitorVideo) => v.status === "winner").length,
    rejected: videos.filter((v: CompetitorVideo) => v.status === "rejected").length,
  };

  return (
    <DashboardLayout activePath="/app/video">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t.video.pageTitle}</h1>
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
        </div>

        {!selectedBrandId ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-border-strong/20 bg-background-subtle">
            <p className="text-sm text-foreground-muted">{t.video.noBrandSelected}</p>
          </div>
        ) : (
          <>
            {/* Filter + Search */}
            <div className="mb-6">
              <VideoStatusFilter
                activeStatus={activeStatus}
                onStatusChange={setActiveStatus}
                search={search}
                onSearchChange={setSearch}
                counts={counts}
              />
            </div>

            {/* Video grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-36 animate-pulse rounded-2xl bg-background-elevated" />
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-border-strong/20 bg-background-subtle text-center">
                <p className="text-sm font-medium text-foreground-muted">{t.video.noVideos}</p>
                <p className="max-w-xs text-xs text-foreground-subtle">{t.video.noVideosHint}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredVideos.map((video: CompetitorVideo) => (
                  <CompetitorVideoCard
                    key={video.id}
                    video={video}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && selectedBrandId && (
        <AddVideoModal
          brandId={selectedBrandId}
          onClose={() => setShowModal(false)}
          onAdd={handleAddVideo}
        />
      )}
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: TypeScript + build check**

```
npx tsc --noEmit
npm run build
```

Expected: 0 TypeScript errors, build succeeds.

---

## Implementation Order

Tasks 1 and 2 can be done in any order. Tasks 3–8 can each be done independently (no inter-dependencies within these tasks). Task 9 depends on all previous tasks being complete.

Suggested parallel dispatch:
- Tasks 1+2 together (simple, no dependencies)
- Tasks 3+4 together (API layer)
- Tasks 5+6+7+8 together (components)
- Task 9 last (page)
