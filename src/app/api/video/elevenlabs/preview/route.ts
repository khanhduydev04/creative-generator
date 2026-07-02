import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { ElevenLabsService } from "@/services/elevenlabsService";
import type { ElevenLabsModel } from "@/services/scriptPrompt";

const PREVIEW_TEXT_MAX_LENGTH = 500;

interface PreviewRequest {
  voice_id?: string;
  text?: string;
  model_id?: ElevenLabsModel;
  stability?: number;
  speed?: number;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    // Safe: request.json() returns the parsed POST body
    const body = (await request.json()) as PreviewRequest;

    if (!body.voice_id || !body.text?.trim()) {
      return NextResponse.json({ error: "voice_id and text are required" }, { status: 400 });
    }
    if (body.text.length > PREVIEW_TEXT_MAX_LENGTH) {
      return NextResponse.json({ error: "text too long (max 500 chars)" }, { status: 400 });
    }

    const elKey = process.env.ELEVENLABS_API_KEY;
    if (!elKey) {
      return NextResponse.json({ error: "elevenlabs_key_missing" }, { status: 500 });
    }

    const service = new ElevenLabsService(elKey);
    const audioBuffer = await service.synthesize({
      text: body.text,
      voice_id: body.voice_id,
      model_id: body.model_id,
      stability: body.stability,
      speed: body.model_id === "eleven_v3" ? undefined : body.speed,
    });

    const base64 = Buffer.from(audioBuffer).toString("base64");
    return NextResponse.json({ audioUrl: `data:audio/mpeg;base64,${base64}` });
  } catch (error) {
    return handleApiError(error);
  }
}
