import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { Persona } from "@/features/brand/types";

interface PersonasResponse {
  personas: Persona[];
}

export function usePersonas(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.personas.list(brandId!),
    queryFn: () =>
      apiFetch<PersonasResponse>(`/api/personas?brandId=${brandId}`),
    enabled: !!brandId,
    select: (data) => data.personas,
  });
}

export function useUpdatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      personaId,
      fields,
    }: {
      personaId: string;
      brandId: string;
      fields: { title?: string; pain?: string; angle?: string; emotion?: string };
    }) =>
      apiFetch<{ persona: Persona }>(`/api/personas/${personaId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.personas.list(variables.brandId),
      });
    },
  });
}

export function useDeletePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      personaId,
    }: {
      personaId: string;
      brandId: string;
    }) =>
      apiFetch<{ success: true }>(`/api/personas/${personaId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.personas.list(variables.brandId),
      });
    },
  });
}
