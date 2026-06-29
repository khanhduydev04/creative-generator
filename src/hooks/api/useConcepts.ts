import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

export interface ConceptPrompt {
  concept_id: string;
  label: string;
  description: string | null;
  requires_competitor: boolean;
  prompt: string | null;
  reference_images: string[];
  hidden?: boolean;
}

export interface UserConcept {
  id: string;
  concept_id: string;
  label: string;
  description: string | null;
  requires_competitor: boolean;
  prompt: string | null;
  reference_images: string[];
  hidden?: boolean;
}

interface ConceptsResponse {
  system: ConceptPrompt[];
  custom: UserConcept[];
}

export function useConcepts() {
  return useQuery({
    queryKey: queryKeys.concepts.all,
    queryFn: () => apiFetch<ConceptsResponse>("/api/concepts"),
  });
}

export function useUpdateConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conceptId,
      ...fields
    }: {
      conceptId: string;
      label?: string;
      description?: string;
      requires_competitor?: boolean;
      prompt?: string;
      reference_images?: string[];
      hidden?: boolean;
    }) =>
      apiFetch<{ concept: ConceptPrompt }>(`/api/concepts/${conceptId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.concepts.all });
    },
  });
}

export function useCreateUserConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      label: string;
      prompt: string;
      description?: string;
      reference_images?: string[];
      requires_competitor?: boolean;
    }) =>
      apiFetch<UserConcept>("/api/user-concepts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.concepts.all });
    },
  });
}

export function useUpdateUserConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...fields
    }: {
      id: string;
      label?: string;
      prompt?: string;
      description?: string;
      reference_images?: string[];
      requires_competitor?: boolean;
    }) =>
      apiFetch<UserConcept>(`/api/user-concepts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.concepts.all });
    },
  });
}

export function useDeleteUserConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/api/user-concepts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.concepts.all });
    },
  });
}

export function useDeleteSystemConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conceptId: string) =>
      apiFetch<{ success: true }>(`/api/concepts/${conceptId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.concepts.all });
    },
  });
}

export function useUploadConceptImage() {
  return useMutation({
    mutationFn: ({ conceptId, file }: { conceptId: string; file: File }) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiFetch<{ url: string; path: string }>(
        `/api/concepts/${conceptId}/upload`,
        { method: "POST", body: fd },
      );
    },
  });
}
