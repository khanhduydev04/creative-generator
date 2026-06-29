import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { Transcript, TranscriptResponse, CreateTranscriptResponse } from "@/features/video/types";

const TRANSCRIPT_POLL_INTERVAL_MS = 3_000;

export function useTranscriptStatus(transcriptId: string | null) {
  return useQuery({
    queryKey: queryKeys.transcripts.detail(transcriptId!),
    queryFn: () =>
      apiFetch<TranscriptResponse>(`/api/video/transcripts/${transcriptId}`),
    enabled: !!transcriptId,
    select: (d) => d.transcript,
    refetchInterval: (query) => {
      // Safe: query.state.data holds the raw queryFn response (TranscriptResponse) before select transforms it
      const status = (query.state.data as Transcript | undefined)?.whisper_status;
      if (status === "processing" || status === "pending") return TRANSCRIPT_POLL_INTERVAL_MS;
      return false;
    },
  });
}

export function useCreateTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) =>
      apiFetch<CreateTranscriptResponse>("/api/video/transcripts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(
        queryKeys.transcripts.detail(data.transcript.id),
        { transcript: data.transcript },
      );
    },
  });
}

export function useRunTranscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transcriptId: string) =>
      apiFetch<TranscriptResponse>(`/api/video/transcripts/${transcriptId}/run`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      qc.setQueryData(
        queryKeys.transcripts.detail(data.transcript.id),
        { transcript: data.transcript },
      );
    },
  });
}

export function usePatchTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transcriptId, editedText }: { transcriptId: string; editedText: string }) =>
      apiFetch<TranscriptResponse>(`/api/video/transcripts/${transcriptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ editedText }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(
        queryKeys.transcripts.detail(data.transcript.id),
        { transcript: data.transcript },
      );
    },
  });
}
