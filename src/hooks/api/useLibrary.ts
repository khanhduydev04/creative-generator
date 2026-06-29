import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

export interface SavedAd {
  name: string;
  storagePath: string;
  publicUrl: string;
  createdAt: string;
  productId: string | null;
  headline: string | null;
  concept: string | null;
  source: string;
}

interface LibraryResponse {
  ads: SavedAd[];
}

export function useLibrary(brandId: string | null, productId?: string) {
  const params = new URLSearchParams();
  if (brandId) params.set("brandId", brandId);
  if (productId) params.set("productId", productId);

  return useQuery({
    queryKey: queryKeys.library.list(brandId!, productId),
    queryFn: () => apiFetch<LibraryResponse>(`/api/saved-ads?${params}`),
    select: (data) => data.ads,
    enabled: !!brandId,
  });
}

export function useDeleteAds(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paths: string[]) =>
      apiFetch<{ success: true }>("/api/saved-ads", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(paths.length === 1 ? { path: paths[0] } : { paths }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.library.list(brandId) });
    },
  });
}

export function useSaveAd(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      imageUrl: string;
      headline?: string;
      concept?: string;
      productId?: string;
    }) =>
      apiFetch<{ path: string; publicUrl: string }>("/api/save-ad", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.library.list(brandId) });
    },
  });
}
