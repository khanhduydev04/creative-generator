import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getUserApiKey } from "@/lib/key-provider";
import { TranscriptService } from "@/services/transcriptService";

const TIKWM_API = "https://www.tikwm.com/api/";
const WHISPER_MAX_BYTES = 25 * 1024 * 1024;
const TIKWM_TIMEOUT_MS = 10_000;
const AUDIO_FETCH_TIMEOUT_MS = 30_000;
const WHISPER_TIMEOUT_MS = 60_000;
const WHISPER_MODEL = "whisper-1";
const TRANSCRIPT_LANGUAGE = "vi";
const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let processingStarted = false;
  let transcriptId: string | null = null;
  let transcriptService: TranscriptService | null = null;

  try {
    const { userId } = await requireUser(request);
    const { id } = await params;
    transcriptId = id;

    const supabase = await createClient();
    const service = new TranscriptService(supabase);
    transcriptService = service;

    const transcript = await service.getById(id);
    if (!transcript) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Fetch tiktok_url from competitor_videos via video_id FK
    const { data: videoRow, error: videoErr } = await supabase
      .from("competitor_videos")
      .select("tiktok_url")
      .eq("id", transcript.video_id)
      .single();

    if (videoErr || !videoRow) {
      return NextResponse.json({ error: "video_not_found" }, { status: 404 });
    }

    await service.updateStatus(id, "processing");
    processingStarted = true;

    // Fetch audio-only music URL from tikwm
    // Safe: videoRow is typed by the select above, which only returns tiktok_url
    const { tiktok_url } = videoRow as { tiktok_url: string };
    const tikwmUrl = `${TIKWM_API}?url=${encodeURIComponent(tiktok_url)}&hd=0`;
    const tikwmRes = await fetch(tikwmUrl, { signal: AbortSignal.timeout(TIKWM_TIMEOUT_MS) });

    if (!tikwmRes.ok) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "tikwm_fetch_failed" }, { status: 502 });
    }

    // Safe: tikwm always returns JSON with this shape when the request succeeds
    const tikwmData = await tikwmRes.json() as { code?: number; data?: { music?: string } };

    if (tikwmData.code !== 0 || !tikwmData.data?.music) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "music_url_unavailable" }, { status: 502 });
    }

    const audioRes = await fetch(tikwmData.data.music, { signal: AbortSignal.timeout(AUDIO_FETCH_TIMEOUT_MS) });
    if (!audioRes.ok) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "audio_fetch_failed" }, { status: 502 });
    }

    const audioBuffer = await audioRes.arrayBuffer();

    if (audioBuffer.byteLength > WHISPER_MAX_BYTES) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
    }

    const openaiKey = await getUserApiKey(userId, "openai");

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "audio.mp3");
    formData.append("model", WHISPER_MODEL);
    formData.append("language", TRANSCRIPT_LANGUAGE);

    const whisperRes = await fetch(WHISPER_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
      signal: AbortSignal.timeout(WHISPER_TIMEOUT_MS),
    });

    if (!whisperRes.ok) {
      await service.updateStatus(id, "failed");
      // Safe: OpenAI error responses follow this shape
      const errBody = await whisperRes.json().catch(() => ({})) as { error?: { message?: string } };
      console.error("[transcripts/run] Whisper error:", errBody);
      return NextResponse.json({ error: "whisper_failed" }, { status: 502 });
    }

    // Safe: OpenAI Whisper transcription responses always include a text field
    const whisperData = await whisperRes.json() as { text?: string };
    const rawText = whisperData.text ?? "";

    const updated = await service.saveRawText(id, rawText);
    return NextResponse.json({ transcript: updated });
  } catch (error) {
    if (processingStarted && transcriptId && transcriptService) {
      await transcriptService.updateStatus(transcriptId, "failed").catch(() => undefined);
    }
    return handleApiError(error);
  }
}
