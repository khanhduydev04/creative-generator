import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getMiniMaxCredentials } from "@/lib/key-provider";
import { MiniMaxService } from "@/services/minimaxService";
import { defaultMiniMaxConfig } from "@/features/video/providerConfig";
import type { MiniMaxModel, MiniMaxEmotion } from "@/services/scriptPrompt";
import type { MiniMaxVoiceModify } from "@/features/video/types";

const PREVIEW_TEXT_MAX_LENGTH = 500;

interface PreviewRequest {
  voice_id?: string;
  text?: string;
  model?: MiniMaxModel;
  speed?: number;
  vol?: number;
  pitch?: number;
  emotion?: MiniMaxEmotion;
  languageBoost?: string;
  voiceModify?: MiniMaxVoiceModify;
  pronunciationDict?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const { apiKey, groupId } = getMiniMaxCredentials();
    const defaults = defaultMiniMaxConfig();
    const service = new MiniMaxService(apiKey, groupId);
    const result = await service.synthesize({
      text: body.text,
      voiceId: body.voice_id,
      model: body.model ?? defaults.model,
      speed: body.speed,
      vol: body.vol,
      pitch: body.pitch,
      emotion: body.emotion,
      languageBoost: body.languageBoost ?? defaults.languageBoost,
      audio: defaults.audio,
      voiceModify: body.voiceModify,
      pronunciationDict: body.pronunciationDict,
    });

    const base64 = Buffer.from(result.audio).toString("base64");
    return NextResponse.json({ audioUrl: `data:audio/mpeg;base64,${base64}` });
  } catch (error) {
    return handleApiError(error);
  }
}
