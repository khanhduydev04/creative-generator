import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { VoicePreset, VbeeVoice, VoiceAvgRating, ElevenLabsVoice } from "@/features/video/types";
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";

const VBEE_VOICES_STALE_MS = 5 * 60 * 1000;
const ELEVENLABS_VOICES_STALE_MS = 10 * 60 * 1000;

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
      pauseConfig?: Record<string, unknown> | null;
      provider?: TtsProvider;
      providerVoiceId?: string | null;
      elevenLabsModel?: ElevenLabsModel | null;
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
