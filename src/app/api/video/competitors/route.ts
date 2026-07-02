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
