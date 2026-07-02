import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getMiniMaxCredentials } from "@/lib/key-provider";
import { MiniMaxService } from "@/services/minimaxService";
import { StorageService } from "@/services/storageService";
import { MiniMaxClonedVoiceService } from "@/services/minimaxClonedVoiceService";
import type { MiniMaxModel } from "@/services/scriptPrompt";

const MAX_CLONE_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
];
const VOICE_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{6,254}[A-Za-z0-9]$/;
const VALID_MODELS: readonly MiniMaxModel[] = [
  "speech-2.6-hd",
  "speech-2.6-turbo",
  "speech-02-hd",
  "speech-02-turbo",
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireUser(request);
    const form = await request.formData();
    const brandId = form.get("brandId");
    const displayName = form.get("displayName");
    const voiceId = form.get("voiceId");
    const modelRaw = form.get("model");
    const file = form.get("file");

    if (typeof brandId !== "string" || typeof displayName !== "string" || typeof voiceId !== "string") {
      return NextResponse.json({ error: "brandId, displayName, voiceId are required" }, { status: 400 });
    }
    if (!VOICE_ID_RE.test(voiceId)) {
      return NextResponse.json({ error: "invalid_voice_id" }, { status: 400 });
    }
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: "invalid_audio_format" }, { status: 400 });
    }
    if (file.size > MAX_CLONE_BYTES) {
      return NextResponse.json({ error: "file too large (max 20MB)" }, { status: 400 });
    }
    const model: MiniMaxModel =
      typeof modelRaw === "string" && VALID_MODELS.includes(modelRaw as MiniMaxModel)
        ? // Safe: membership checked against VALID_MODELS
          (modelRaw as MiniMaxModel)
        : "speech-2.6-hd";

    const arrayBuffer = await file.arrayBuffer();
    const filename = file instanceof File ? file.name : "clone-source";

    const { apiKey, groupId } = getMiniMaxCredentials();
    const service = new MiniMaxService(apiKey, groupId);
    const fileId = await service.uploadFile(arrayBuffer, filename);
    const clone = await service.cloneVoice({ fileId, voiceId, model, needNoiseReduction: true });

    const supabase = await createClient();
    const storage = new StorageService(supabase);
    const sourcePath = `clone-src/${brandId}/${voiceId}.mp3`;
    await storage.upload("generated-audio", sourcePath, arrayBuffer, file.type);

    const clonedService = new MiniMaxClonedVoiceService(supabase);
    const voice = await clonedService.create({
      brandId,
      voiceId,
      displayName,
      model,
      status: "ready",
      sourceStoragePath: sourcePath,
    });

    return NextResponse.json({ voice, demoAudioUrl: clone.demoAudioUrl }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
