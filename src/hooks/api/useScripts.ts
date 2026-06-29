import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { BrandScript, PatchScriptResponse } from "@/features/video/types";

export function useScripts(transcriptId: string | null) {
  return useQuery({
    queryKey: queryKeys.scripts.list(transcriptId!),
    queryFn: () =>
      apiFetch<{ scripts: BrandScript[] }>(
        `/api/video/scripts?transcriptId=${transcriptId}`,
      ),
    enabled: !!transcriptId,
    select: (d) => d.scripts,
  });
}

export function usePatchScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scriptId,
      finalText,
    }: {
      scriptId: string;
      finalText: string;
      transcriptId: string;
    }) =>
      apiFetch<PatchScriptResponse>(`/api/video/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ finalText }),
      }),
    onSuccess: (_data, { transcriptId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.scripts.list(transcriptId) });
    },
  });
}
