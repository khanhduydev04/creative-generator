import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getUserApiKey } from "@/lib/key-provider";
import { VbeeService } from "@/services/vbeeService";
import { GeneratedAudioService } from "@/services/generatedAudioService";
import { StorageService } from "@/services/storageService";
import type { GenerateAudioRequest, VoicePreset } from "@/features/video/types";

const AUDIO_DOWNLOAD_TIMEOUT_MS = 30_000;

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const scriptId = searchParams.get("scriptId");

    if (!brandId && !scriptId) {
      return NextResponse.json({ error: "brandId or scriptId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new GeneratedAudioService(supabase);
    const audios = scriptId
      ? await service.listByScript(scriptId)
      : await service.listByBrand(brandId!);

    return NextResponse.json({ audios });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    // Safe: request.json() returns the parsed POST body
    const body = (await request.json()) as GenerateAudioRequest;

    if (!body.scriptId || !body.voicePresetId) {
      return NextResponse.json({ error: "scriptId and voicePresetId are required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: script, error: scriptError } = await supabase
      .from("brand_scripts")
      .select("final_text, raw_text, brand_id")
      .eq("id", body.scriptId)
      .single();

    if (scriptError || !script) {
      return NextResponse.json({ error: "script_not_found" }, { status: 404 });
    }

    const textToSpeak = (script.final_text ?? script.raw_text ?? "") as string;
    if (!textToSpeak.trim()) {
      return NextResponse.json({ error: "script_text_empty" }, { status: 400 });
    }

    const { data: preset, error: presetError } = await supabase
      .from("voice_presets")
      .select("*")
      .eq("id", body.voicePresetId)
      .single();

    if (presetError || !preset) {
      return NextResponse.json({ error: "voice_preset_not_found" }, { status: 404 });
    }

    const vbeeKey = await getUserApiKey(userId, "vbee");
    const vbeeService = new VbeeService(vbeeKey);
    // Safe: Supabase returns voice_preset row matching VoicePreset shape
    const typedPreset = preset as VoicePreset;
    const ttsResult = await vbeeService.synthesize({
      text: textToSpeak,
      voice_code: typedPreset.voice_code,
      speed: typedPreset.speed,
      pitch: typedPreset.pitch,
    });

    const audioRes = await fetch(ttsResult.audio_url, { signal: AbortSignal.timeout(AUDIO_DOWNLOAD_TIMEOUT_MS) });
    if (!audioRes.ok) {
      return NextResponse.json({ error: "audio_download_failed" }, { status: 502 });
    }

    const audioBuffer = await audioRes.arrayBuffer();
    // Safe: script.brand_id is a string UUID from Supabase
    const brandId = script.brand_id as string;
    const storagePath = `audio/${brandId}/${body.scriptId}/${Date.now()}.mp3`;

    const storage = new StorageService(supabase);
    await storage.upload("generated-audio", storagePath, audioBuffer, "audio/mpeg");

    const audioService = new GeneratedAudioService(supabase);
    const audio = await audioService.create({
      scriptId: body.scriptId,
      brandId,
      voicePresetId: body.voicePresetId,
      storagePath,
      vbeeAudioUrl: ttsResult.audio_url,
      durationSecs: ttsResult.duration ?? null,
    });

    return NextResponse.json({ audio }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
