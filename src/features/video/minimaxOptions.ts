import type { MiniMaxModel, MiniMaxEmotion, MiniMaxSoundEffect } from "@/services/scriptPrompt";

export const MINIMAX_MODEL_OPTIONS: { value: MiniMaxModel; label: string }[] = [
  { value: "speech-2.6-hd", label: "2.6 HD (chất lượng cao)" },
  { value: "speech-2.6-turbo", label: "2.6 Turbo (nhanh, rẻ)" },
  { value: "speech-02-hd", label: "02 HD" },
  { value: "speech-02-turbo", label: "02 Turbo" },
];

export const MINIMAX_EMOTION_OPTIONS: { value: MiniMaxEmotion; label: string }[] = [
  { value: "calm", label: "Bình thản" },
  { value: "happy", label: "Vui vẻ" },
  { value: "sad", label: "Buồn" },
  { value: "angry", label: "Giận dữ" },
  { value: "fearful", label: "Sợ hãi" },
  { value: "disgusted", label: "Ghê tởm" },
  { value: "surprised", label: "Ngạc nhiên" },
  { value: "fluent", label: "Trôi chảy" },
  { value: "whisper", label: "Thì thầm" },
];

export const MINIMAX_LANGUAGE_OPTIONS: string[] = [
  "Vietnamese", "auto", "English", "Chinese", "Japanese", "Korean", "Thai", "Indonesian",
];

export const MINIMAX_SOUND_EFFECT_OPTIONS: { value: MiniMaxSoundEffect; label: string }[] = [
  { value: "spacious_echo", label: "Vọng rộng" },
  { value: "auditorium_echo", label: "Khán phòng" },
  { value: "lofi_telephone", label: "Điện thoại lo-fi" },
  { value: "robotic", label: "Robot" },
];

export const MINIMAX_BITRATE_OPTIONS: number[] = [32000, 64000, 128000, 256000];
export const MINIMAX_SAMPLE_RATE_OPTIONS: number[] = [16000, 24000, 32000, 44100];

export const MINIMAX_SPEED_MIN = 0.5;
export const MINIMAX_SPEED_MAX = 2.0;
export const MINIMAX_SPEED_STEP = 0.1;
export const MINIMAX_VOL_MIN = 0.1;
export const MINIMAX_VOL_MAX = 10;
export const MINIMAX_VOL_STEP = 0.1;
export const MINIMAX_PITCH_MIN = -12;
export const MINIMAX_PITCH_MAX = 12;
export const MINIMAX_PITCH_STEP = 1;
export const MINIMAX_PREVIEW_TEXT_MAX_LENGTH = 500;
