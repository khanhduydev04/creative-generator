import type { ElevenLabsModel } from "@/services/scriptPrompt";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";
const ELEVENLABS_DEFAULT_MODEL: ElevenLabsModel = "eleven_flash_v2_5";
const ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128";
const ELEVENLABS_VOICES_TIMEOUT_MS = 10_000;
const ELEVENLABS_SYNTHESIZE_TIMEOUT_MS = 60_000;

export interface ElevenLabsVoiceItem {
  voice_id: string;
  name: string;
  category: string;
  preview_url: string | null;
  labels: Record<string, string>;
}

export interface ElevenLabsTTSRequest {
  text: string;
  voice_id: string;
  model_id?: ElevenLabsModel;
  speed?: number;
  stability?: number;
  similarity_boost?: number;
  style?: number;
}

export class ElevenLabsService {
  constructor(private readonly apiKey: string) {}

  async listVoices(): Promise<ElevenLabsVoiceItem[]> {
    const res = await fetch(
      `${ELEVENLABS_API_BASE}/v2/voices?page_size=100`,
      {
        headers: { "xi-api-key": this.apiKey },
        signal: AbortSignal.timeout(ELEVENLABS_VOICES_TIMEOUT_MS),
      },
    );
    if (!res.ok) throw new Error(`ElevenLabs list voices failed: ${res.status}`);
    // Safe: ElevenLabs /v2/voices always returns { voices: [...] }
    const data = (await res.json()) as { voices?: ElevenLabsVoiceItem[] };
    return data.voices ?? [];
  }

  async synthesize(request: ElevenLabsTTSRequest): Promise<ArrayBuffer> {
    const url = `${ELEVENLABS_API_BASE}/v1/text-to-speech/${request.voice_id}?output_format=${ELEVENLABS_OUTPUT_FORMAT}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: request.text,
        model_id: request.model_id ?? ELEVENLABS_DEFAULT_MODEL,
        voice_settings: {
          stability: request.stability ?? 0.5,
          similarity_boost: request.similarity_boost ?? 0.75,
          style: request.style ?? 0.0,
          ...(request.speed !== undefined ? { speed: request.speed } : {}),
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(ELEVENLABS_SYNTHESIZE_TIMEOUT_MS),
    });
    if (!res.ok) {
      // Safe: ElevenLabs error responses include a detail object; fallback to empty object if body is not JSON
      const err = (await res.json().catch(() => ({}))) as {
        detail?: { message?: string };
      };
      throw new Error(err.detail?.message ?? `ElevenLabs TTS failed: ${res.status}`);
    }
    return res.arrayBuffer();
  }
}
