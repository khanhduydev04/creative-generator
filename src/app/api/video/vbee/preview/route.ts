import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getUserApiKey } from "@/lib/key-provider";
import { VbeeService } from "@/services/vbeeService";

const PREVIEW_TEXT_MAX_LENGTH = 500;

interface PreviewRequest {
  voice_code: string;
  text: string;
  speed?: number;
  pitch?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    // Safe: request.json() returns the parsed POST body
    const body = (await request.json()) as PreviewRequest;

    if (!body.voice_code || !body.text?.trim()) {
      return NextResponse.json({ error: "voice_code and text are required" }, { status: 400 });
    }

    if (body.text.length > PREVIEW_TEXT_MAX_LENGTH) {
      return NextResponse.json({ error: "text too long (max 500 chars)" }, { status: 400 });
    }

    const apiKey = await getUserApiKey(userId, "vbee");
    const service = new VbeeService(apiKey);
    const result = await service.synthesize({
      text: body.text,
      voice_code: body.voice_code,
      speed: body.speed,
      pitch: body.pitch,
    });

    // Return Vbee URL directly for preview — no storage upload
    return NextResponse.json({ audioUrl: result.audio_url });
  } catch (error) {
    return handleApiError(error);
  }
}
