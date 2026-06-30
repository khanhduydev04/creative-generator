import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { BrandApifyConfig } from "@/features/video/types";

export function useApifyConfig(brandId: string | null) {
  return useQuery({
    // brandId! is safe: enabled: !!brandId ensures queryFn never runs when brandId is null
    queryKey: queryKeys.apifyConfig.detail(brandId!),
    queryFn: () =>
      apiFetch<{ config: BrandApifyConfig | null }>(
        `/api/video/apify-config?brandId=${brandId}`,
      ),
    enabled: !!brandId,
    select: (d) => d.config,
  });
}

export function useSaveApifyConfig(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { apifyTaskId: string; isEnabled: boolean }) =>
      apiFetch<{ config: BrandApifyConfig }>("/api/video/apify-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId,
          apifyTaskId: payload.apifyTaskId,
          isEnabled: payload.isEnabled,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.apifyConfig.detail(brandId) });
    },
  });
}

export function useSyncApify(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; upserted: number }>("/api/video/apify-config/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.apifyConfig.detail(brandId) });
    },
  });
}
