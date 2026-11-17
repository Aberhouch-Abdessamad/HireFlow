import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { FeedbackPayload, Interview, InterviewPayload } from './types';

export const interviewKeys = {
  all: ['interviews'] as const,
  list: (params: api.InterviewListParams) => [...interviewKeys.all, 'list', params] as const,
  detail: (id: number) => [...interviewKeys.all, 'detail', id] as const,
  feedback: (id: number) => [...interviewKeys.all, 'feedback', id] as const,
};

export function useInterviews(params: api.InterviewListParams, enabled = true) {
  return useQuery({
    queryKey: interviewKeys.list(params),
    queryFn: () => api.fetchInterviews(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useInterview(id: number) {
  return useQuery({
    queryKey: interviewKeys.detail(id),
    queryFn: () => api.fetchInterview(id),
    enabled: Number.isFinite(id),
  });
}

export function useFeedback(id: number) {
  return useQuery({ queryKey: interviewKeys.feedback(id), queryFn: () => api.fetchFeedback(id) });
}

function useInterviewChanged() {
  const queryClient = useQueryClient();
  return (interview: Interview) => {
    queryClient.setQueryData(interviewKeys.detail(interview.id), interview);
    void queryClient.invalidateQueries({ queryKey: [...interviewKeys.all, 'list'] });
    void queryClient.invalidateQueries({ queryKey: ['applications'] });
  };
}

export function useSaveInterview() {
  const changed = useInterviewChanged();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: InterviewPayload }) =>
      id === undefined ? api.scheduleInterview(payload) : api.updateInterview(id, payload),
    onSuccess: changed,
  });
}

export function useCancelInterview() {
  const changed = useInterviewChanged();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string | null }) =>
      api.cancelInterview(id, reason),
    onSuccess: changed,
  });
}

export function useCompleteInterview() {
  const changed = useInterviewChanged();
  return useMutation({ mutationFn: api.completeInterview, onSuccess: changed });
}

export function useSubmitFeedback(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FeedbackPayload) => api.submitFeedback(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: interviewKeys.feedback(id) });
      void queryClient.invalidateQueries({ queryKey: interviewKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: [...interviewKeys.all, 'list'] });
    },
  });
}

export function useInterviewers(enabled: boolean) {
  return useQuery({
    queryKey: ['interviewers'],
    queryFn: api.fetchInterviewers,
    staleTime: 60_000,
    enabled,
  });
}
