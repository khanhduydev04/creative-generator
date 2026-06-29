import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

export interface ApiKeyEntry {
  provider: string;
  masked: string;
  updated_at: string;
}

interface ApiKeysResponse {
  keys: ApiKeyEntry[];
}

export function useApiKeys() {
  return useQuery({
    queryKey: queryKeys.apiKeys.all,
    queryFn: () => apiFetch<ApiKeysResponse>("/api/user-api-keys"),
    select: (data) => data.keys,
  });
}

export function useSaveApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, key }: { provider: string; key: string }) =>
      apiFetch<{ ok: true; masked: string }>("/api/user-api-keys", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, key }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) =>
      apiFetch<{ ok: true }>(`/api/user-api-keys/${provider}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}
