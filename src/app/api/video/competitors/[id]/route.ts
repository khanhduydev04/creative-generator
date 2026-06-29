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
