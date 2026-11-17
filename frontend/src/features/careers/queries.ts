import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as api from './api';

export function usePublicJobs(params: api.PublicJobParams) {
  return useQuery({
    queryKey: ['public', 'jobs', params],
    queryFn: () => api.fetchPublicJobs(params),
    placeholderData: keepPreviousData,
  });
}

export function usePublicJob(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['public', 'job', slug],
    queryFn: () => api.fetchPublicJob(slug),
    retry: false,
    enabled: enabled && slug !== '',
  });
}

export function usePublicCompany(slug: string | undefined) {
  return useQuery({
    queryKey: ['public', 'company', slug],
    queryFn: () => api.fetchPublicCompany(slug ?? ''),
    enabled: Boolean(slug),
    retry: false,
  });
}
