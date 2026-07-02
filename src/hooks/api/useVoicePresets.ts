import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type {
  VoicePreset,
  VbeeVoice,
  VoiceAvgRating,
  ElevenLabsVoice,
  MiniMaxVoice,
  MiniMaxProviderConfig,
  MiniMaxVoiceModify,
} from "@/features/video/types";
import type { TtsProvider, ElevenLabsModel, MiniMaxModel, MiniMaxEmotion } from "@/services/scriptPrompt";

const VBEE_VOICES_STALE_MS = 5 * 60 * 1000;
const ELEVENLABS_VOICES_STALE_MS = 10 * 60 * 1000;
const MINIMAX_VOICES_STALE_MS = 10 * 60 * 1000;

export function useVoicePresets(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.voicePresets.list(brandId!),
    queryFn: () =>
      apiFetch<{ presets: VoicePreset[] }>(`/api/video/voice-presets?brandId=${brandId}`),
    enabled: !!brandId,
    select: (d) => d.presets,
  });
}

export function useCreateVoicePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      brandId: string;
      displayName: string;
      voiceCode: string;
      speed: number;
      pitch: number;
      stability: number;
      pauseConfig?: Record<string, unknown> | null;
      provider?: TtsProvider;
      providerVoiceId?: string | null;
      elevenLabsModel?: ElevenLabsModel | null;
      providerConfig?: MiniMaxProviderConfig | null;
      isDefault?: boolean;
    }) =>
      apiFetch<{ preset: VoicePreset }>("/api/video/voice-presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.voicePresets.list(brandId) });
    },
  });
}

export function useElevenLabsVoices(enabled: boolean) {
  return useQuery({
    queryKey: ["elevenlabs-voices"],
    queryFn: () => apiFetch<{ voices: ElevenLabsVoice[] }>("/api/video/elevenlabs/voices"),
    select: (d) => d.voices,
    staleTime: ELEVENLABS_VOICES_STALE_MS,
    enabled,
  });
}

export function useElevenLabsPreview() {
  return useMutation({
    mutationFn: (input: {
      voiceId: string;
      text: string;
      modelId?: ElevenLabsModel;
      stability?: number;
      speed?: number;
    }) =>
      apiFetch<{ audioUrl: string }>("/api/video/elevenlabs/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          voice_id: input.voiceId,
          text: input.text,
          model_id: input.modelId,
          stability: input.stability,
          speed: input.speed,
        }),
      }),
  });
}

export function useDeleteVoicePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ presetId }: { presetId: string; brandId: string }) =>
      apiFetch<{ ok: boolean }>(`/api/video/voice-presets/${presetId}`, { method: "DELETE" }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.voicePresets.list(brandId) });
    },
  });
}

export function useVbeeVoices() {
  return useQuery({
    queryKey: queryKeys.vbeeVoices.all,
    queryFn: () => apiFetch<{ voices: VbeeVoice[] }>("/api/video/vbee/voices"),
    select: (d) => d.voices,
    staleTime: VBEE_VOICES_STALE_MS,
  });
}

export function useVoiceRatings(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.voiceRatings.avg(brandId!),
    queryFn: () =>
      apiFetch<{ ratings: VoiceAvgRating[] }>(`/api/video/voice-ratings?brandId=${brandId}`),
    enabled: !!brandId,
    select: (d) => d.ratings,
  });
}

export function useSubmitVoiceRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { brandId: string; voiceCode: string; score: number; note?: string }) =>
      apiFetch("/api/video/voice-ratings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId: input.brandId,
          voiceCode: input.voiceCode,
          score: input.score,
          note: input.note,
        }),
      }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.voiceRatings.avg(brandId) });
    },
  });
}

export interface MiniMaxPreviewInput {
  voiceId: string;
  text: string;
  model?: MiniMaxModel;
  speed?: number;
  vol?: number;
  pitch?: number;
  emotion?: MiniMaxEmotion;
  languageBoost?: string;
  voiceModify?: MiniMaxVoiceModify;
  pronunciationDict?: string[];
}

export function buildMiniMaxPreviewBody(input: MiniMaxPreviewInput): Record<string, unknown> {
  return {
    voice_id: input.voiceId,
    text: input.text,
    model: input.model,
    speed: input.speed,
    vol: input.vol,
    pitch: input.pitch,
    emotion: input.emotion,
    languageBoost: input.languageBoost,
    voiceModify: input.voiceModify,
    pronunciationDict: input.pronunciationDict,
  };
}

export function useMiniMaxVoices(brandId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["minimax-voices", brandId],
    queryFn: () =>
      apiFetch<{ voices: MiniMaxVoice[] }>(`/api/video/minimax/voices?brandId=${brandId}`),
    select: (d) => d.voices,
    staleTime: MINIMAX_VOICES_STALE_MS,
    enabled: enabled && !!brandId,
  });
}

export function useMiniMaxPreview() {
  return useMutation({
    mutationFn: (input: MiniMaxPreviewInput) =>
      apiFetch<{ audioUrl: string }>("/api/video/minimax/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildMiniMaxPreviewBody(input)),
      }),
  });
}

export function useCloneMiniMaxVoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      brandId: string;
      displayName: string;
      voiceId: string;
      model: MiniMaxModel;
      file: File;
    }) => {
      const form = new FormData();
      form.append("brandId", input.brandId);
      form.append("displayName", input.displayName);
      form.append("voiceId", input.voiceId);
      form.append("model", input.model);
      form.append("file", input.file);
      return apiFetch<{ voice: { id: string; voice_id: string }; demoAudioUrl?: string }>(
        "/api/video/minimax/clone",
        { method: "POST", body: form },
      );
    },
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: ["minimax-voices", brandId] });
    },
  });
}
