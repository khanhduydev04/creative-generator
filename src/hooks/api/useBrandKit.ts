import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

interface LogoUrls {
  lightUrl: string | null;
  darkUrl: string | null;
}

interface BrandKitResponse {
  kit: Record<string, unknown> | null;
  logoUrls: LogoUrls;
}

export function useBrandKit(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.brandKit.detail(brandId!),
    queryFn: () => apiFetch<BrandKitResponse>(`/api/brand-kit/${brandId}`),
    enabled: !!brandId,
  });
}

export function useSaveBrandKit(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: Record<string, unknown>) =>
      apiFetch<BrandKitResponse>(`/api/brand-kit/${brandId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brandKit.detail(brandId) });
    },
  });
}

export function useUploadLogo(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, logoType }: { file: File; logoType: "light" | "dark" }) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("logoType", logoType);
      return apiFetch<{ kit: Record<string, unknown>; logoUrls: LogoUrls }>(
        `/api/brand-kit/${brandId}/logo`,
        { method: "POST", body: fd },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brandKit.detail(brandId) });
    },
  });
}

export function useUploadFont(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<{ kit: Record<string, unknown>; logoUrls: LogoUrls; specimenUrl: string }>(
        `/api/brand-kit/${brandId}/font`,
        { method: "POST", body: formData },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brandKit.detail(brandId) });
    },
  });
}

export function useResetBrand(brandId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ kit: Record<string, unknown> }>(`/api/brand-kit/${brandId}/reset`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brandKit.detail(brandId) });
      qc.invalidateQueries({ queryKey: queryKeys.intelligence.detail(brandId) });
    },
  });
}
