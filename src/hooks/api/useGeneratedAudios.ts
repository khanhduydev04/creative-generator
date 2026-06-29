import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { GeneratedAudio, GenerateAudioResponse } from "@/features/video/types";

export function useGeneratedAudiosByBrand(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.generatedAudios.list(brandId!),
    queryFn: () =>
      apiFetch<{ audios: GeneratedAudio[] }>(`/api/video/audio?brandId=${brandId}`),
    enabled: !!brandId,
    select: (d) => d.audios,
  });
}

export function useGeneratedAudiosByScript(scriptId: string | null) {
  return useQuery({
    queryKey: queryKeys.generatedAudios.byScript(scriptId!),
    queryFn: () =>
      apiFetch<{ audios: GeneratedAudio[] }>(`/api/video/audio?scriptId=${scriptId}`),
    enabled: !!scriptId,
    select: (d) => d.audios,
  });
}

export function useGenerateAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { scriptId: string; voicePresetId: string; brandId: string }) =>
      apiFetch<GenerateAudioResponse>("/api/video/audio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scriptId: input.scriptId, voicePresetId: input.voicePresetId }),
      }),
    onSuccess: (_data, { scriptId, brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.generatedAudios.byScript(scriptId) });
      void qc.invalidateQueries({ queryKey: queryKeys.generatedAudios.list(brandId) });
    },
  });
}

export function useDeleteAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ audioId }: { audioId: string; scriptId: string; brandId: string }) =>
      apiFetch<{ ok: boolean }>(`/api/video/audio/${audioId}`, { method: "DELETE" }),
    onSuccess: (_data, { scriptId, brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.generatedAudios.byScript(scriptId) });
      void qc.invalidateQueries({ queryKey: queryKeys.generatedAudios.list(brandId) });
    },
  });
}
