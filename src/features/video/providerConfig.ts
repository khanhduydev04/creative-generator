import type {
  MiniMaxProviderConfig,
  MiniMaxAudioSetting,
  MiniMaxVoiceModify,
} from "@/features/video/types";
import type {
  MiniMaxModel,
  MiniMaxEmotion,
  MiniMaxSoundEffect,
} from "@/services/scriptPrompt";

const MINIMAX_MODELS: readonly MiniMaxModel[] = [
  "speech-2.6-hd",
  "speech-2.6-turbo",
  "speech-02-hd",
  "speech-02-turbo",
];
const MINIMAX_EMOTIONS: readonly MiniMaxEmotion[] = [
  "happy", "sad", "angry", "fearful", "disgusted",
  "surprised", "calm", "fluent", "whisper",
];
const MINIMAX_SOUND_EFFECTS: readonly MiniMaxSoundEffect[] = [
  "spacious_echo", "auditorium_echo", "lofi_telephone", "robotic",
];

const DEFAULT_AUDIO: MiniMaxAudioSetting = {
  format: "mp3",
  sampleRate: 32000,
  bitrate: 128000,
  channel: 1,
};
const DEFAULT_LANGUAGE_BOOST = "Vietnamese";
const DEFAULT_MODEL: MiniMaxModel = "speech-2.6-hd";

export function defaultMiniMaxConfig(): MiniMaxProviderConfig {
  return {
    kind: "minimax",
    model: DEFAULT_MODEL,
    languageBoost: DEFAULT_LANGUAGE_BOOST,
    audio: { ...DEFAULT_AUDIO },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAudio(raw: unknown): MiniMaxAudioSetting {
  if (!isRecord(raw)) return { ...DEFAULT_AUDIO };
  return {
    format: "mp3",
    sampleRate: typeof raw.sampleRate === "number" ? raw.sampleRate : DEFAULT_AUDIO.sampleRate,
    bitrate: typeof raw.bitrate === "number" ? raw.bitrate : DEFAULT_AUDIO.bitrate,
    channel: raw.channel === 2 ? 2 : 1,
  };
}

function parseVoiceModify(raw: unknown): MiniMaxVoiceModify | undefined {
  if (!isRecord(raw)) return undefined;
  const out: MiniMaxVoiceModify = {};
  if (typeof raw.pitch === "number") out.pitch = raw.pitch;
  if (typeof raw.intensity === "number") out.intensity = raw.intensity;
  if (typeof raw.timbre === "number") out.timbre = raw.timbre;
  if (
    typeof raw.soundEffects === "string" &&
    MINIMAX_SOUND_EFFECTS.includes(raw.soundEffects as MiniMaxSoundEffect)
  ) {
    // Safe: membership checked against MINIMAX_SOUND_EFFECTS above
    out.soundEffects = raw.soundEffects as MiniMaxSoundEffect;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseMiniMaxConfig(json: unknown): MiniMaxProviderConfig | null {
  if (!isRecord(json)) return null;
  if (typeof json.model !== "string" || !MINIMAX_MODELS.includes(json.model as MiniMaxModel)) {
    return null;
  }
  // Safe: membership checked against MINIMAX_MODELS above
  const model = json.model as MiniMaxModel;

  const config: MiniMaxProviderConfig = {
    kind: "minimax",
    model,
    audio: parseAudio(json.audio),
    languageBoost:
      typeof json.languageBoost === "string" ? json.languageBoost : DEFAULT_LANGUAGE_BOOST,
  };

  if (
    typeof json.emotion === "string" &&
    MINIMAX_EMOTIONS.includes(json.emotion as MiniMaxEmotion)
  ) {
    // Safe: membership checked against MINIMAX_EMOTIONS above
    config.emotion = json.emotion as MiniMaxEmotion;
  }
  if (typeof json.vol === "number") config.vol = json.vol;
  if (typeof json.pitch === "number") config.pitch = json.pitch;

  const voiceModify = parseVoiceModify(json.voiceModify);
  if (voiceModify) config.voiceModify = voiceModify;

  if (Array.isArray(json.pronunciationDict)) {
    const dict = json.pronunciationDict.filter((x): x is string => typeof x === "string");
    if (dict.length > 0) config.pronunciationDict = dict;
  }

  return config;
}
