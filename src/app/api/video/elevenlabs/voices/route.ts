import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { ElevenLabsService } from "@/services/elevenlabsService";
import type { ElevenLabsVoiceItem } from "@/services/elevenlabsService";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireUser(request);
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "elevenlabs_key_missing" }, { status: 500 });
    }
    const service = new ElevenLabsService(apiKey);
    const voices: ElevenLabsVoiceItem[] = await service.listVoices();
    return NextResponse.json({ voices });
  } catch (error) {
    return handleApiError(error);
  }
}
