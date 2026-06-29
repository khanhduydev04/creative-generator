import type { VbeeVoice } from "@/features/video/types";

const VBEE_API_BASE = "https://vbee.vn/api/v1";
const VBEE_VOICES_TIMEOUT_MS = 10_000;
const VBEE_SYNTHESIZE_TIMEOUT_MS = 30_000;
const VBEE_DEFAULT_SPEED = 1.0;
const VBEE_DEFAULT_PITCH = 1.0;
const VBEE_DEFAULT_FORMAT = "mp3";

export interface VbeeTTSRequest {
  text: string;
  voice_code: string;
  speed?: number;
  pitch?: number;
  output_format?: string;
}

export interface VbeeTTSResponse {
  audio_url: string;
  duration?: number;
}

export class VbeeService {
  constructor(private readonly apiKey: string) {}

  async listVoices(): Promise<VbeeVoice[]> {
    const res = await fetch(`${VBEE_API_BASE}/voices`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(VBEE_VOICES_TIMEOUT_MS),
    });

    if (!res.ok) throw new Error(`Vbee voices failed: ${res.status}`);
    // Vbee API returns either `voices` or `data` field; narrowing to union handles both response formats
    const data = await res.json() as { voices?: VbeeVoice[]; data?: VbeeVoice[] };
    return data.voices ?? data.data ?? [];
  }

  async synthesize(request: VbeeTTSRequest): Promise<VbeeTTSResponse> {
    const res = await fetch(`${VBEE_API_BASE}/tts/convert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: request.text,
        voice_code: request.voice_code,
        speed: request.speed ?? VBEE_DEFAULT_SPEED,
        pitch: request.pitch ?? VBEE_DEFAULT_PITCH,
        output_format: request.output_format ?? VBEE_DEFAULT_FORMAT,
      }),
      signal: AbortSignal.timeout(VBEE_SYNTHESIZE_TIMEOUT_MS),
    });

    if (!res.ok) {
      // Wrapped in catch block with fallback to empty object; worst case matches type safely
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? `Vbee TTS failed: ${res.status}`);
    }

    // audio_url is validated immediately after; error thrown if missing
    const data = await res.json() as VbeeTTSResponse;
    if (!data.audio_url) throw new Error("Vbee returned no audio_url");
    return data;
  }
}
