import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { TranscriptService } from "@/services/transcriptService";

const TRANSCRIPT_EXISTS_ERROR = "TRANSCRIPT_EXISTS";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new TranscriptService(supabase);
    const transcript = await service.getByVideoId(videoId);
    return NextResponse.json({ transcript });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    // Safe: request.json() always returns the parsed JSON body from POST requests
    const body = await request.json() as { videoId?: string };

    if (!body.videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new TranscriptService(supabase);

    try {
      const transcript = await service.create(body.videoId);
      return NextResponse.json({ transcript }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message === TRANSCRIPT_EXISTS_ERROR) {
        const existing = await service.getByVideoId(body.videoId);
        return NextResponse.json({ transcript: existing });
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
