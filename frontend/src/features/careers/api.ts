import type { EmploymentType, WorkMode } from '@/features/jobs/types';
import { ensureCsrfCookie, http } from '@/services/http';
import type { ApiResource, Paginated } from '@/types/api';
import type { PublicCompany, PublicJob, PublicJobDetail } from './types';

export interface PublicJobParams {
  page: number;
  search?: string;
  company?: string;
  employment_type?: EmploymentType;
  work_mode?: WorkMode;
  location?: string;
}

export async function fetchPublicJobs(params: PublicJobParams): Promise<Paginated<PublicJob>> {
  return (
    await http.get<Paginated<PublicJob>>('/public/jobs', { params: { ...params, per_page: 10 } })
  ).data;
}

export async function fetchPublicJob(slug: string): Promise<PublicJobDetail> {
  return (await http.get<ApiResource<PublicJobDetail>>(`/public/jobs/${encodeURIComponent(slug)}`))
    .data.data;
}

export async function fetchPublicCompany(slug: string): Promise<PublicCompany> {
  return (
    await http.get<ApiResource<PublicCompany>>(`/public/companies/${encodeURIComponent(slug)}`)
  ).data.data;
}

export interface ApplyPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  cover_letter: string;
  cv: File | null;
  consent: boolean;
  website: string;
}

/** Submits a careers-page application (multipart). Returns the confirmation message. */
export async function applyToJob(slug: string, payload: ApplyPayload): Promise<string> {
  await ensureCsrfCookie();
  const body = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'cv') {
      if (value instanceof File) body.append('cv', value);
    } else if (key === 'consent') {
      body.append('consent', value ? '1' : '0');
    } else if (typeof value === 'string' && value !== '') {
      body.append(key, value);
    }
  }
  const response = await http.post<{ message: string }>(
    `/public/jobs/${encodeURIComponent(slug)}/apply`,
    body,
  );
  return response.data.message;
}
