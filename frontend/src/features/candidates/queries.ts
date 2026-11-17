import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { CandidatePayload } from './types';

export const candidateKeys = {
  all: ['candidates'] as const,
  list: (params: api.CandidateListParams) => [...candidateKeys.all, 'list', params] as const,
  detail: (id: number) => [...candidateKeys.all, 'detail', id] as const,
  applications: (id: number) => [...candidateKeys.all, 'applications', id] as const,
  notes: (id: number) => [...candidateKeys.all, 'notes', id] as const,
  tags: () => ['tags'] as const,
};

export function useCandidates(params: api.CandidateListParams) {
  return useQuery({
    queryKey: candidateKeys.list(params),
    queryFn: () => api.fetchCandidates(params),
    placeholderData: keepPreviousData,
  });
}

export function useCandidate(id: number) {
  return useQuery({
    queryKey: candidateKeys.detail(id),
    queryFn: () => api.fetchCandidate(id),
    enabled: Number.isFinite(id),
  });
}

export function useCandidateApplications(id: number) {
  return useQuery({
    queryKey: candidateKeys.applications(id),
    queryFn: () => api.fetchCandidateApplications(id),
  });
}

export function useCandidateNotes(id: number) {
  return useQuery({
    queryKey: candidateKeys.notes(id),
    queryFn: () => api.fetchCandidateNotes(id),
  });
}

export function useTags() {
  return useQuery({ queryKey: candidateKeys.tags(), queryFn: api.fetchTags, staleTime: 60_000 });
}

export function useSaveCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: CandidatePayload }) =>
      id === undefined ? api.createCandidate(payload) : api.updateCandidate(id, payload),
    onSuccess: (candidate) => {
      queryClient.setQueryData(candidateKeys.detail(candidate.id), candidate);
      void queryClient.invalidateQueries({ queryKey: [...candidateKeys.all, 'list'] });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.tags() });
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteCandidate,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: candidateKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.all });
    },
  });
}

export function useAddCandidateNote(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.addCandidateNote(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: candidateKeys.notes(id) }),
  });
}

export function useCandidateDocuments(id: number) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: candidateKeys.detail(id) });
  return {
    upload: useMutation({
      mutationFn: (file: File) => api.uploadDocument(id, file),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (documentId: number) => api.deleteDocument(id, documentId),
      onSuccess: refresh,
    }),
  };
}
