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
