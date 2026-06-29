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

export function useCompetitorVideos(brandId: string | null, status?: VideoStatus) {
  return useQuery({
    queryKey: queryKeys.competitorVideos.list(brandId!, status),
    queryFn: () => {
      const params = new URLSearchParams({ brandId: brandId! });
      if (status) params.set("status", status);
      return apiFetch<CompetitorVideosResponse>(
        `/api/video/competitors?${params.toString()}`,
      );
    },
    enabled: !!brandId,
    select: (data) => data.videos,
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
      void qc.invalidateQueries({
        queryKey: queryKeys.competitorVideos.list(brandId),
      });
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
      void qc.invalidateQueries({
        queryKey: queryKeys.competitorVideos.list(brandId),
      });
    },
  });
}

export type { CompetitorVideo };
