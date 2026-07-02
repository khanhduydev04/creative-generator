import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getUserApiKey } from "@/lib/key-provider";
import { TranscriptService } from "@/services/transcriptService";
import { GoogleGenAI, createPartFromUri, FileState } from "@google/genai";

const TIKWM_API = "https://www.tikwm.com/api/";
const TIKWM_TIMEOUT_MS = 10_000;
const AUDIO_FETCH_TIMEOUT_MS = 30_000;

const GEMINI_MODEL = "gemini-2.5-flash";
const TRANSCRIPT_LANGUAGE = "vi";

// The full video file carries the real mixed audio (speech + background music);
// tikwm's `music` field is only the isolated soundtrack and contains no speech,
// so it must NOT be used as the transcription source. Labeling the mp4 bytes as
// audio makes Gemini decode only the audio track (audio-rate tokens, ~9x cheaper
// than sending video frames).
const AUDIO_MIME_TYPE = "audio/mp4";

// Gemini inline requests must stay under a ~20MB total payload; base64 inflates
// bytes by ~33%, so cap the raw buffer well below that and fall back to the File
// API for longer videos.
const INLINE_MAX_BYTES = 15 * 1024 * 1024;
const FILE_ACTIVE_POLL_INTERVAL_MS = 1_000;
const FILE_ACTIVE_MAX_POLLS = 60;

function buildTranscriptionPrompt(): string {
  return `Transcribe the spoken content of this audio in ${TRANSCRIPT_LANGUAGE} language. Return only the transcribed text, no explanations or timestamps.`;
}

// Small files go inline; larger ones are uploaded via the File API to bypass the
// inline payload ceiling, then deleted once transcription completes.
async function transcribeAudio(
  genai: GoogleGenAI,
  audioBuffer: ArrayBuffer,
): Promise<string> {
  const prompt = buildTranscriptionPrompt();

  if (audioBuffer.byteLength <= INLINE_MAX_BYTES) {
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    const inlineRes = await genai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: AUDIO_MIME_TYPE, data: audioBase64 } },
          { text: prompt },
        ],
      },
    });
    return inlineRes.text ?? "";
  }

  let uploaded = await genai.files.upload({
    file: new Blob([Buffer.from(audioBuffer)], { type: AUDIO_MIME_TYPE }),
    config: { mimeType: AUDIO_MIME_TYPE },
  });

  try {
    let polls = 0;
    while (uploaded.state !== FileState.ACTIVE) {
      if (uploaded.state === FileState.FAILED) {
        throw new Error("gemini_file_processing_failed");
      }
      if (polls >= FILE_ACTIVE_MAX_POLLS) {
        throw new Error("gemini_file_processing_timeout");
      }
      await new Promise((resolve) => setTimeout(resolve, FILE_ACTIVE_POLL_INTERVAL_MS));
      uploaded = await genai.files.get({ name: uploaded.name ?? "" });
      polls++;
    }

    if (!uploaded.uri || !uploaded.mimeType) {
      throw new Error("gemini_file_missing_uri");
    }

    const fileRes = await genai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [createPartFromUri(uploaded.uri, uploaded.mimeType), { text: prompt }],
    });
    return fileRes.text ?? "";
  } finally {
    if (uploaded.name) {
      await genai.files.delete({ name: uploaded.name }).catch(() => undefined);
    }
  }
}

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

    // Fetch the full video URL from tikwm — its audio track holds the real
    // speech. Safe: videoRow is typed by the select above (only tiktok_url).
    const { tiktok_url } = videoRow as { tiktok_url: string };
    const tikwmUrl = `${TIKWM_API}?url=${encodeURIComponent(tiktok_url)}&hd=0`;
    const tikwmRes = await fetch(tikwmUrl, { signal: AbortSignal.timeout(TIKWM_TIMEOUT_MS) });

    if (!tikwmRes.ok) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "tikwm_fetch_failed" }, { status: 502 });
    }

    // Safe: tikwm always returns JSON with this shape when the request succeeds
    const tikwmData = await tikwmRes.json() as { code?: number; data?: { play?: string } };

    if (tikwmData.code !== 0 || !tikwmData.data?.play) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "media_url_unavailable" }, { status: 502 });
    }

    const audioRes = await fetch(tikwmData.data.play, { signal: AbortSignal.timeout(AUDIO_FETCH_TIMEOUT_MS) });
    if (!audioRes.ok) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "audio_fetch_failed" }, { status: 502 });
    }

    const audioBuffer = await audioRes.arrayBuffer();

    const googleKey = await getUserApiKey(userId, "google");
    const genai = new GoogleGenAI({ apiKey: googleKey });
    const rawText = await transcribeAudio(genai, audioBuffer);

    if (!rawText.trim()) {
      await service.updateStatus(id, "failed");
      console.error("[transcripts/run] Gemini returned empty transcription");
      return NextResponse.json({ error: "transcription_empty" }, { status: 502 });
    }

    const updated = await service.saveRawText(id, rawText);
    return NextResponse.json({ transcript: updated });
  } catch (error) {
    if (processingStarted && transcriptId && transcriptService) {
      await transcriptService.updateStatus(transcriptId, "failed").catch(() => undefined);
    }
    return handleApiError(error);
  }
}
