import { http } from '@/services/http';
import type { ApiResource, Paginated } from '@/types/api';
import type {
  Feedback,
  FeedbackList,
  FeedbackPayload,
  Interview,
  InterviewPayload,
  InterviewStatus,
} from './types';

export interface InterviewListParams {
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
  status?: InterviewStatus;
  mine?: boolean;
  application_id?: number;
}

export async function fetchInterviews(params: InterviewListParams): Promise<Paginated<Interview>> {
  const query = { ...params, mine: params.mine ? 1 : undefined };
  return (await http.get<Paginated<Interview>>('/interviews', { params: query })).data;
}

export async function fetchInterview(id: number): Promise<Interview> {
  return (await http.get<ApiResource<Interview>>(`/interviews/${id}`)).data.data;
}

export async function scheduleInterview(payload: InterviewPayload): Promise<Interview> {
  return (await http.post<ApiResource<Interview>>('/interviews', payload)).data.data;
}

export async function updateInterview(
  id: number,
  payload: Partial<InterviewPayload>,
): Promise<Interview> {
  return (await http.put<ApiResource<Interview>>(`/interviews/${id}`, payload)).data.data;
}

export async function cancelInterview(id: number, reason: string | null): Promise<Interview> {
  return (await http.post<ApiResource<Interview>>(`/interviews/${id}/cancel`, { reason })).data
    .data;
}

export async function completeInterview(id: number): Promise<Interview> {
  return (await http.post<ApiResource<Interview>>(`/interviews/${id}/complete`)).data.data;
}

export async function fetchFeedback(id: number): Promise<FeedbackList> {
  return (await http.get<FeedbackList>(`/interviews/${id}/feedback`)).data;
}

export async function submitFeedback(id: number, payload: FeedbackPayload): Promise<Feedback> {
  return (await http.post<ApiResource<Feedback>>(`/interviews/${id}/feedback`, payload)).data.data;
}

/** Downloads a CV through the interview-scoped endpoint. */
export async function downloadInterviewDocument(url: string, name: string): Promise<void> {
  const response = await http.get<Blob>(url.replace(/^\/api\/v1/, ''), { responseType: 'blob' });
  const href = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  link.click();
  URL.revokeObjectURL(href);
}

export async function fetchInterviewers(): Promise<
  { id: number; name: string; email: string; role: string | null }[]
> {
  return (
    await http.get<{ data: { id: number; name: string; email: string; role: string | null }[] }>(
      '/company/interviewers',
    )
  ).data.data;
}
