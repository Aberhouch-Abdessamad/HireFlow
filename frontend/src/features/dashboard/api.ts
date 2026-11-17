import { http } from '@/services/http';
import type { ApiResource, Paginated } from '@/types/api';
import type {
  AppNotification,
  DashboardOverview,
  HiringFunnelData,
  JobStatusSplit,
  MonthlySeriesItem,
  PeriodParams,
  RecruiterPerformanceRow,
  TimeToHireData,
  Workspace,
} from './types';

export async function fetchDashboardOverview(
  params: PeriodParams = {},
): Promise<DashboardOverview> {
  return (await http.get<ApiResource<DashboardOverview>>('/dashboard/overview', { params })).data
    .data;
}

export async function fetchWorkspace(): Promise<Workspace> {
  return (await http.get<ApiResource<Workspace>>('/dashboard/workspace')).data.data;
}

export async function fetchApplicationsSeries(params: PeriodParams): Promise<MonthlySeriesItem[]> {
  return (await http.get<{ data: MonthlySeriesItem[] }>('/analytics/applications', { params })).data
    .data;
}

export async function fetchHiringFunnel(params: PeriodParams): Promise<HiringFunnelData> {
  return (await http.get<ApiResource<HiringFunnelData>>('/analytics/hiring-funnel', { params }))
    .data.data;
}

export async function fetchJobsAnalytics(params: PeriodParams): Promise<JobStatusSplit> {
  return (await http.get<ApiResource<JobStatusSplit>>('/analytics/jobs', { params })).data.data;
}

export async function fetchRecruiterPerformance(
  params: PeriodParams,
): Promise<RecruiterPerformanceRow[]> {
  return (await http.get<{ data: RecruiterPerformanceRow[] }>('/analytics/recruiters', { params }))
    .data.data;
}

export async function fetchTimeToHire(params: PeriodParams): Promise<TimeToHireData> {
  return (await http.get<ApiResource<TimeToHireData>>('/analytics/time-to-hire', { params })).data
    .data;
}

export async function fetchNotifications(
  params: { unread?: boolean; per_page?: number } = {},
): Promise<Paginated<AppNotification>> {
  // Laravel's boolean rule accepts 1/0, not the strings "true"/"false" axios would send.
  const query = { ...params, unread: params.unread ? 1 : undefined };
  const res = await http.get<Paginated<AppNotification>>('/notifications', { params: query });
  return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await http.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.post('/notifications/read-all');
}
