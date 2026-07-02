import type {
  MiniMaxModel,
  MiniMaxEmotion,
} from "@/services/scriptPrompt";
import type {
  MiniMaxAudioSetting,
  MiniMaxVoiceModify,
} from "@/features/video/types";
import {
  ProviderError,
  providerErrorStatus,
  mapMiniMaxStatusCode,
} from "@/services/providerError";

const MINIMAX_API_BASE = "https://api.minimax.io";
const SYNTHESIZE_TIMEOUT_MS = 60_000;
const VOICES_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 60_000;
const CLONE_TIMEOUT_MS = 120_000;

export interface MiniMaxTTSRequest {
  text: string;
  voiceId: string;
  model: MiniMaxModel;
  speed?: number;
  vol?: number;
  pitch?: number;
  emotion?: MiniMaxEmotion;
  languageBoost?: string;
  audio: MiniMaxAudioSetting;
  voiceModify?: MiniMaxVoiceModify;
  pronunciationDict?: string[];
}

export interface MiniMaxSynthesisResult {
  audio: ArrayBuffer;
  durationSecs: number;
}

export interface MiniMaxVoiceItem {
  voice_id: string;
  name: string;
  category: "system" | "cloned";
}

export interface MiniMaxCloneVoiceInput {
  fileId: number;
  voiceId: string;
  model: MiniMaxModel;
  needNoiseReduction?: boolean;
  accuracy?: number;
  previewText?: string;
  languageBoost?: string;
}

interface MiniMaxVoiceRaw {
  voice_id?: string;
  voice_name?: string;
  description?: string;
}

interface MiniMaxGetVoiceResponse {
  system_voice?: MiniMaxVoiceRaw[];
  voice_cloning?: MiniMaxVoiceRaw[];
  base_resp?: MiniMaxBaseResp;
}

interface MiniMaxBaseResp {
  status_code?: number;
  status_msg?: string;
}

interface MiniMaxT2AResponse {
  data?: { audio?: string; status?: number };
  extra_info?: { audio_length?: number };
  base_resp?: MiniMaxBaseResp;
}

export class MiniMaxService {
  constructor(
    private readonly apiKey: string,
    private readonly groupId: string,
  ) {}

  private url(path: string): string {
    return `${MINIMAX_API_BASE}${path}?GroupId=${encodeURIComponent(this.groupId)}`;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private httpStatusToKind(status: number): "invalid_key" | "rate_limited" | "unknown" {
    if (status === 401 || status === 403) return "invalid_key";
    if (status === 429) return "rate_limited";
    return "unknown";
  }

  async synthesize(req: MiniMaxTTSRequest): Promise<MiniMaxSynthesisResult> {
    const body: Record<string, unknown> = {
      model: req.model,
      text: req.text,
      stream: false,
      output_format: "hex",
      language_boost: req.languageBoost ?? "auto",
      voice_setting: {
        voice_id: req.voiceId,
        speed: req.speed ?? 1.0,
        vol: req.vol ?? 1.0,
        pitch: req.pitch ?? 0,
        ...(req.emotion ? { emotion: req.emotion } : {}),
      },
      audio_setting: {
        sample_rate: req.audio.sampleRate,
        bitrate: req.audio.bitrate,
        format: req.audio.format,
        channel: req.audio.channel,
      },
    };

    if (req.voiceModify) {
      const vm: Record<string, unknown> = {};
      if (typeof req.voiceModify.pitch === "number") vm.pitch = req.voiceModify.pitch;
      if (typeof req.voiceModify.intensity === "number") vm.intensity = req.voiceModify.intensity;
      if (typeof req.voiceModify.timbre === "number") vm.timbre = req.voiceModify.timbre;
      if (req.voiceModify.soundEffects) vm.sound_effects = req.voiceModify.soundEffects;
      if (Object.keys(vm).length > 0) body.voice_modify = vm;
    }
    if (req.pronunciationDict && req.pronunciationDict.length > 0) {
      body.pronunciation_dict = { tone: req.pronunciationDict };
    }

    const res = await fetch(this.url("/v1/t2a_v2"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(SYNTHESIZE_TIMEOUT_MS),
    });

    if (!res.ok) {
      const kind = this.httpStatusToKind(res.status);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind));
    }

    // Safe: MiniMax T2A always returns a JSON object with base_resp
    const json = (await res.json()) as MiniMaxT2AResponse;
    const statusCode = json.base_resp?.status_code;
    if (statusCode !== 0) {
      const kind = mapMiniMaxStatusCode(statusCode);
      throw new ProviderError(
        "minimax",
        kind,
        providerErrorStatus(kind),
        json.base_resp?.status_msg,
      );
    }

    const hex = json.data?.audio;
    if (!hex) {
      throw new ProviderError("minimax", "unknown", providerErrorStatus("unknown"), "empty audio");
    }
    const buffer = Buffer.from(hex, "hex");
    const audio = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    const durationSecs = (json.extra_info?.audio_length ?? 0) / 1000;
    return { audio, durationSecs };
  }

  async listVoices(): Promise<MiniMaxVoiceItem[]> {
    const res = await fetch(this.url("/v1/get_voice"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ voice_type: "all" }),
      signal: AbortSignal.timeout(VOICES_TIMEOUT_MS),
    });
    if (!res.ok) {
      const kind = this.httpStatusToKind(res.status);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind));
    }
    // Safe: get_voice returns an object with optional voice arrays
    const json = (await res.json()) as MiniMaxGetVoiceResponse;
    const system = (json.system_voice ?? []).map((v): MiniMaxVoiceItem => ({
      voice_id: v.voice_id ?? "",
      name: v.voice_name ?? v.description ?? v.voice_id ?? "",
      category: "system",
    }));
    const cloned = (json.voice_cloning ?? []).map((v): MiniMaxVoiceItem => ({
      voice_id: v.voice_id ?? "",
      name: v.voice_name ?? v.description ?? v.voice_id ?? "",
      category: "cloned",
    }));
    return [...system, ...cloned].filter((v) => v.voice_id.length > 0);
  }

  async uploadFile(file: ArrayBuffer, filename: string): Promise<number> {
    const form = new FormData();
    form.append("purpose", "voice_clone");
    form.append("file", new Blob([file]), filename);

    const res = await fetch(this.url("/v1/files/upload"), {
      method: "POST",
      // NOTE: do NOT set Content-Type — fetch sets the multipart boundary itself
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    if (!res.ok) {
      const kind = this.httpStatusToKind(res.status);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind));
    }
    // Safe: files/upload returns { file: { file_id } } on success
    const json = (await res.json()) as {
      file?: { file_id?: number };
      base_resp?: MiniMaxBaseResp;
    };
    if (json.base_resp && json.base_resp.status_code !== 0) {
      const kind = mapMiniMaxStatusCode(json.base_resp.status_code);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind), json.base_resp.status_msg);
    }
    const fileId = json.file?.file_id;
    if (typeof fileId !== "number") {
      throw new ProviderError("minimax", "unknown", providerErrorStatus("unknown"), "no file_id");
    }
    return fileId;
  }

  async cloneVoice(input: MiniMaxCloneVoiceInput): Promise<{ demoAudioUrl?: string }> {
    const body: Record<string, unknown> = {
      file_id: input.fileId,
      voice_id: input.voiceId,
      model: input.model,
    };
    if (input.needNoiseReduction !== undefined) body.need_noise_reduction = input.needNoiseReduction;
    if (input.accuracy !== undefined) body.accuracy = input.accuracy;
    if (input.previewText) body.text = input.previewText;
    if (input.languageBoost) body.language_boost = input.languageBoost;

    const res = await fetch(this.url("/v1/voice_clone"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CLONE_TIMEOUT_MS),
    });
    if (!res.ok) {
      const kind = this.httpStatusToKind(res.status);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind));
    }
    // Safe: voice_clone returns { demo_audio?, base_resp }
    const json = (await res.json()) as {
      demo_audio?: string;
      base_resp?: MiniMaxBaseResp;
    };
    if (json.base_resp && json.base_resp.status_code !== 0) {
      const kind = mapMiniMaxStatusCode(json.base_resp.status_code);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind), json.base_resp.status_msg);
    }
    return { demoAudioUrl: json.demo_audio };
  }
}
