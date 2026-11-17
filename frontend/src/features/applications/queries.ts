import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { Application, PipelineColumn, RejectionReason, StageType } from './types';

export const applicationKeys = {
  all: ['applications'] as const,
  list: (params: api.ApplicationListParams) => [...applicationKeys.all, 'list', params] as const,
  pipeline: (jobId?: number) => [...applicationKeys.all, 'pipeline', jobId ?? 'all'] as const,
  detail: (id: number) => [...applicationKeys.all, 'detail', id] as const,
  history: (id: number) => [...applicationKeys.all, 'history', id] as const,
  notes: (id: number) => [...applicationKeys.all, 'notes', id] as const,
  stages: () => ['recruitment-stages'] as const,
};

export function useApplications(params: api.ApplicationListParams) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: () => api.fetchApplications(params),
    placeholderData: keepPreviousData,
  });
}

export function usePipeline(jobId?: number) {
  return useQuery({
    queryKey: applicationKeys.pipeline(jobId),
    queryFn: () => api.fetchPipeline(jobId),
  });
}

export function useApplication(id: number) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => api.fetchApplication(id),
    enabled: Number.isFinite(id),
  });
}

export function useApplicationHistory(id: number) {
  return useQuery({
    queryKey: applicationKeys.history(id),
    queryFn: () => api.fetchApplicationHistory(id),
  });
}

export function useApplicationNotes(id: number) {
  return useQuery({
    queryKey: applicationKeys.notes(id),
    queryFn: () => api.fetchApplicationNotes(id),
  });
}

/** After any change, refresh the record, its history, lists, the board, and related candidate/job data. */
function useApplicationChanged() {
  const queryClient = useQueryClient();
  return (application: Application) => {
    queryClient.setQueryData(applicationKeys.detail(application.id), application);
    void queryClient.invalidateQueries({ queryKey: applicationKeys.history(application.id) });
    void queryClient.invalidateQueries({ queryKey: [...applicationKeys.all, 'list'] });
    void queryClient.invalidateQueries({ queryKey: [...applicationKeys.all, 'pipeline'] });
    void queryClient.invalidateQueries({ queryKey: applicationKeys.stages() });
    void queryClient.invalidateQueries({ queryKey: ['candidates'] });
    void queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };
}

export function useCreateApplication() {
  const changed = useApplicationChanged();
  return useMutation({ mutationFn: api.createApplication, onSuccess: changed });
}

/**
 * Moves an application. On the board the card moves immediately (optimistic update) and goes
 * back if the API refuses the move.
 */
export function useMoveApplication(jobId?: number) {
  const queryClient = useQueryClient();
  const changed = useApplicationChanged();
  const key = applicationKeys.pipeline(jobId);

  return useMutation({
    mutationFn: ({ id, stageId, notes }: { id: number; stageId: number; notes?: string }) =>
      api.moveApplication(id, stageId, notes),
    onMutate: async ({ id, stageId }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PipelineColumn[]>(key);
      if (previous) {
        const moving = previous.flatMap((column) => column.applications).find((a) => a.id === id);
        if (moving) {
          queryClient.setQueryData<PipelineColumn[]>(
            key,
            previous.map((column) => ({
              ...column,
              applications:
                column.stage.id === stageId
                  ? [...column.applications.filter((a) => a.id !== id), moving]
                  : column.applications.filter((a) => a.id !== id),
            })),
          );
        }
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: changed,
  });
}

export function useAssignApplication() {
  const changed = useApplicationChanged();
  return useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: number | null }) =>
      api.assignApplication(id, userId),
    onSuccess: changed,
  });
}

export function useRejectApplication() {
  const changed = useApplicationChanged();
  return useMutation({
    mutationFn: ({ id, reason, note }: { id: number; reason: RejectionReason; note?: string }) =>
      api.rejectApplication(id, reason, note),
    onSuccess: changed,
  });
}

export function useReopenApplication() {
  const changed = useApplicationChanged();
  return useMutation({ mutationFn: api.reopenApplication, onSuccess: changed });
}

export function useAddApplicationNote(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.addApplicationNote(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: applicationKeys.notes(id) }),
  });
}

export function useStages() {
  return useQuery({
    queryKey: applicationKeys.stages(),
    queryFn: api.fetchStages,
    staleTime: 60_000,
  });
}

export function useStageMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: applicationKeys.stages() });
    void queryClient.invalidateQueries({ queryKey: [...applicationKeys.all, 'pipeline'] });
  };
  return {
    create: useMutation({
      mutationFn: (payload: { name: string; type: StageType; position: number }) =>
        api.createStage(payload),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, ...payload }: { id: number; name: string; position?: number }) =>
        api.updateStage(id, payload),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: api.deleteStage, onSuccess }),
  };
}
