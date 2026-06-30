import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { BrandProduct } from "@/features/brand/types";

interface ProductsResponse {
  products: BrandProduct[];
}

export function useProducts(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.products.list(brandId!),
    queryFn: () =>
      apiFetch<ProductsResponse>(`/api/brand-products?brandId=${brandId}`),
    select: (data) => data.products,
    enabled: !!brandId,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      brand_id: string;
      name: string;
      description?: string | null;
      images?: string[];
      product_url?: string | null;
      primary_color_1?: string | null;
      primary_color_2?: string | null;
      secondary_color_1?: string | null;
      secondary_color_2?: string | null;
      accent_color_1?: string | null;
      accent_color_2?: string | null;
      attributes?: string | null;
      target_audience?: string | null;
      selling_points?: string | null;
      price?: string | null;
    }) =>
      apiFetch<{ product: BrandProduct }>("/api/brand-products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.products.list(variables.brand_id),
      });
    },
  });
}

export function useUpdateProduct(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      ...fields
    }: {
      productId: string;
      name?: string;
      description?: string | null;
      images?: string[];
      product_url?: string | null;
      primary_color_1?: string | null;
      primary_color_2?: string | null;
      secondary_color_1?: string | null;
      secondary_color_2?: string | null;
      accent_color_1?: string | null;
      accent_color_2?: string | null;
      attributes?: string | null;
      target_audience?: string | null;
      selling_points?: string | null;
      price?: string | null;
    }) =>
      apiFetch<{ product: BrandProduct }>(`/api/brand-products/${productId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products.list(brandId) });
    },
  });
}

export function useDeleteProduct(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      apiFetch<{ success: true }>(`/api/brand-products/${productId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products.list(brandId) });
    },
  });
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiFetch<{ url: string; path: string }>(
        `/api/brand-products/${productId}/upload`,
        { method: "POST", body: fd },
      );
    },
  });
}

export function useScrapeProduct(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, url }: { productId: string; url?: string }) =>
      apiFetch<{ success: true; productContext: unknown; cachedAt: string }>(
        `/api/brand-products/${productId}/scrape-context`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(url ? { url } : {}),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products.list(brandId) });
    },
  });
}
