import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { Persona } from "@/features/brand/types";

interface ResearchSummary {
  id: string;
  content: string;
  brand_id: string;
  created_at: string;
  updated_at: string;
}

interface IntelligenceResponse {
  summary: ResearchSummary | null;
}

export function useBrandIntelligence(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.intelligence.detail(brandId!),
    queryFn: () =>
      apiFetch<IntelligenceResponse>(`/api/brand-intelligence/${brandId}`),
    enabled: !!brandId,
  });
}

export function useSaveResearch(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiFetch<IntelligenceResponse>(`/api/brand-intelligence/${brandId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.intelligence.detail(brandId) });
    },
  });
}

export function useGeneratePersonas(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ personas: Persona[] }>(
        `/api/brand-intelligence/${brandId}/generate-personas`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.personas.list(brandId) });
    },
  });
}
