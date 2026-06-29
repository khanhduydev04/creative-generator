import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

export interface Brand {
  id: string;
  name: string;
  description?: string | null;
}

interface BrandsResponse {
  brands: Brand[];
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: () => apiFetch<BrandsResponse>("/api/brands"),
    select: (data) => data.brands,
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ brand: Brand }>("/api/brands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brands.all });
    },
  });
}

export function useBrandDetail(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.brands.detail(brandId!),
    queryFn: () => apiFetch<{ brand: Brand }>(`/api/brands/${brandId}`),
    enabled: !!brandId,
    select: (data) => data.brand,
  });
}

export function useRenameBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brandId, name }: { brandId: string; name: string }) =>
      apiFetch<{ brand: Brand }>(`/api/brands/${brandId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brands.all });
    },
  });
}

export function useUpdateBrand(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: { name?: string; description?: string }) =>
      apiFetch<{ brand: Brand }>(`/api/brands/${brandId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brands.all });
      qc.invalidateQueries({ queryKey: queryKeys.brands.detail(brandId) });
    },
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (brandId: string) =>
      apiFetch<{ success: true }>(`/api/brands/${brandId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brands.all });
    },
  });
}
