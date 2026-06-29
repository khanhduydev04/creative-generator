import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";

interface TikwmResponse {
  code?: number;
  data?: { play?: string };
}

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

    const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(video.tiktok_url as string)}&hd=0`;
    const res = await fetch(tikwmUrl, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      return NextResponse.json({ cdnUrl: null });
    }

    const tikwmData = (await res.json()) as TikwmResponse;

    if (tikwmData.code !== 0 || !tikwmData.data?.play) {
      return NextResponse.json({ cdnUrl: null });
    }

    return NextResponse.json({ cdnUrl: tikwmData.data.play });
  } catch (e) {
    return handleApiError(e);
  }
}
