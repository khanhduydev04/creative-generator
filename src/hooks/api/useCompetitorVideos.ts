import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type {
  CompetitorVideo,
  CompetitorVideosResponse,
  AddVideoResponse,
  UpdateVideoResponse,
  VideoStatus,
} from "@/features/video/types";

export function useCompetitorVideos(
  brandId: string | null,
  status: VideoStatus = "pending",
  page = 1,
  q?: string,
) {
  return useQuery({
    queryKey: queryKeys.competitorVideos.list(brandId!, status, page, q),
    queryFn: () => {
      const params = new URLSearchParams({ brandId: brandId!, status, page: String(page) });
      if (q && q.trim()) params.set("q", q.trim());
      return apiFetch<CompetitorVideosResponse>(
        `/api/video/competitors?${params.toString()}`,
      );
    },
    enabled: !!brandId,
  });
}

export function useAddCompetitorVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brandId, tiktokUrl }: { brandId: string; tiktokUrl: string }) =>
      apiFetch<AddVideoResponse>("/api/video/competitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId, tiktokUrl }),
      }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.competitorVideos.all(brandId) });
    },
  });
}

export function useUpdateVideoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      videoId,
      status,
    }: {
      videoId: string;
      status: VideoStatus;
      brandId: string;
    }) =>
      apiFetch<UpdateVideoResponse>(`/api/video/competitors/${videoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.competitorVideos.all(brandId) });
    },
  });
}

export type { CompetitorVideo };
