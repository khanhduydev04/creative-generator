import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getMiniMaxCredentials } from "@/lib/key-provider";
import { MiniMaxService } from "@/services/minimaxService";
import { MiniMaxClonedVoiceService } from "@/services/minimaxClonedVoiceService";
import type { MiniMaxVoice } from "@/features/video/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireUser(request);
    const brandId = new URL(request.url).searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    const { apiKey, groupId } = getMiniMaxCredentials();
    const systemVoices = await new MiniMaxService(apiKey, groupId).listVoices();

    const supabase = await createClient();
    const clonedRows = await new MiniMaxClonedVoiceService(supabase).listByBrand(brandId);
    const clonedVoices: MiniMaxVoice[] = clonedRows.map((row) => ({
      voice_id: row.voice_id,
      name: row.display_name,
      category: "cloned",
    }));

    // Only "system" voices from the shared MiniMax account are safe to show
    // here — "cloned" entries from listVoices() are account-wide (shared
    // MINIMAX_GROUP_ID across brands) and would leak other brands' clones.
    // This brand's own clones come exclusively from the RLS-scoped DB table.
    const merged: MiniMaxVoice[] = [
      ...systemVoices.filter((v) => v.category === "system"),
      ...clonedVoices,
    ];

    return NextResponse.json({ voices: merged });
  } catch (error) {
    return handleApiError(error);
  }
}
