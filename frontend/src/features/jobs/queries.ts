import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { JobPayload, JobPosting, JobTransition } from './types';

export const jobKeys = {
  all: ['jobs'] as const,
  list: (params: api.JobListParams) => [...jobKeys.all, 'list', params] as const,
  detail: (id: number) => [...jobKeys.all, 'detail', id] as const,
  departments: () => ['departments'] as const,
  skills: (search: string) => ['skills', search] as const,
  recruiters: () => ['recruiters'] as const,
};

export function useJobs(params: api.JobListParams) {
  return useQuery({
    queryKey: jobKeys.list(params),
    queryFn: () => api.fetchJobs(params),
    placeholderData: keepPreviousData,
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => api.fetchJob(id),
    enabled: Number.isFinite(id),
  });
}

function useJobCacheUpdate() {
  const queryClient = useQueryClient();
  return (job: JobPosting) => {
    queryClient.setQueryData(jobKeys.detail(job.id), job);
    void queryClient.invalidateQueries({ queryKey: [...jobKeys.all, 'list'] });
    void queryClient.invalidateQueries({ queryKey: jobKeys.departments() });
  };
}

export function useSaveJob() {
  const update = useJobCacheUpdate();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: JobPayload }) =>
      id === undefined ? api.createJob(payload) : api.updateJob(id, payload),
    onSuccess: update,
  });
}

export function useJobTransition() {
  const update = useJobCacheUpdate();
  return useMutation({
    mutationFn: ({ id, transition }: { id: number; transition: JobTransition }) =>
      api.transitionJob(id, transition),
    onSuccess: update,
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteJob,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: jobKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: jobKeys.departments(),
    queryFn: api.fetchDepartments,
    staleTime: 60_000,
  });
}

export function useSaveDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id?: number;
      payload: { name: string; description: string | null };
    }) => (id === undefined ? api.createDepartment(payload) : api.updateDepartment(id, payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobKeys.departments() }),
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteDepartment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.departments() });
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useSkillSuggestions(search: string) {
  return useQuery({
    queryKey: jobKeys.skills(search),
    queryFn: () => api.fetchSkills(search),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useRecruiters() {
  return useQuery({
    queryKey: jobKeys.recruiters(),
    queryFn: api.fetchRecruiters,
    staleTime: 60_000,
  });
}
