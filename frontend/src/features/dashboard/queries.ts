import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { PeriodParams } from './types';

export const dashboardKeys = {
  overview: (params: PeriodParams) => ['dashboard', 'overview', params] as const,
  applications: (params: PeriodParams) => ['analytics', 'applications', params] as const,
  funnel: (params: PeriodParams) => ['analytics', 'funnel', params] as const,
  jobs: (params: PeriodParams) => ['analytics', 'jobs', params] as const,
  recruiters: (params: PeriodParams) => ['analytics', 'recruiters', params] as const,
  timeToHire: (params: PeriodParams) => ['analytics', 'time-to-hire', params] as const,
  notifications: ['notifications'] as const,
  workspace: ['dashboard', 'workspace'] as const,
};

export function useDashboardOverview(params: PeriodParams) {
  return useQuery({
    queryKey: dashboardKeys.overview(params),
    queryFn: () => api.fetchDashboardOverview(params),
  });
}

export function useWorkspace(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.workspace,
    queryFn: api.fetchWorkspace,
    enabled,
  });
}

export function useApplicationsSeries(params: PeriodParams) {
  return useQuery({
    queryKey: dashboardKeys.applications(params),
    queryFn: () => api.fetchApplicationsSeries(params),
  });
}

export function useHiringFunnel(params: PeriodParams) {
  return useQuery({
    queryKey: dashboardKeys.funnel(params),
    queryFn: () => api.fetchHiringFunnel(params),
  });
}

export function useJobsAnalytics(params: PeriodParams) {
  return useQuery({
    queryKey: dashboardKeys.jobs(params),
    queryFn: () => api.fetchJobsAnalytics(params),
  });
}

export function useRecruiterPerformance(params: PeriodParams) {
  return useQuery({
    queryKey: dashboardKeys.recruiters(params),
    queryFn: () => api.fetchRecruiterPerformance(params),
  });
}

export function useTimeToHire(params: PeriodParams) {
  return useQuery({
    queryKey: dashboardKeys.timeToHire(params),
    queryFn: () => api.fetchTimeToHire(params),
  });
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: [...dashboardKeys.notifications, unreadOnly],
    queryFn: () => api.fetchNotifications({ unread: unreadOnly || undefined, per_page: 20 }),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: dashboardKeys.notifications }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: dashboardKeys.notifications }),
  });
}
