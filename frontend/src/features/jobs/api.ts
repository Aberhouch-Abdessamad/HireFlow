import { http } from '@/services/http';
import type { ApiResource, Paginated } from '@/types/api';
import type {
  AssignableUser,
  Department,
  EmploymentType,
  JobPayload,
  JobPosting,
  JobStatus,
  JobTransition,
} from './types';

export interface JobListParams {
  page: number;
  per_page: number;
  search?: string;
  status?: JobStatus;
  department_id?: number;
  employment_type?: EmploymentType;
  sort?: string;
}

export async function fetchJobs(params: JobListParams): Promise<Paginated<JobPosting>> {
  return (await http.get<Paginated<JobPosting>>('/jobs', { params })).data;
}

export async function fetchJob(id: number): Promise<JobPosting> {
  return (await http.get<ApiResource<JobPosting>>(`/jobs/${id}`)).data.data;
}

export async function createJob(payload: JobPayload): Promise<JobPosting> {
  return (await http.post<ApiResource<JobPosting>>('/jobs', payload)).data.data;
}

export async function updateJob(id: number, payload: JobPayload): Promise<JobPosting> {
  return (await http.put<ApiResource<JobPosting>>(`/jobs/${id}`, payload)).data.data;
}

export async function deleteJob(id: number): Promise<void> {
  await http.delete(`/jobs/${id}`);
}

export async function transitionJob(id: number, transition: JobTransition): Promise<JobPosting> {
  return (await http.post<ApiResource<JobPosting>>(`/jobs/${id}/${transition}`)).data.data;
}

export async function fetchDepartments(): Promise<Department[]> {
  return (await http.get<{ data: Department[] }>('/departments')).data.data;
}

export async function createDepartment(payload: {
  name: string;
  description: string | null;
}): Promise<Department> {
  return (await http.post<ApiResource<Department>>('/departments', payload)).data.data;
}

export async function updateDepartment(
  id: number,
  payload: { name: string; description: string | null },
): Promise<Department> {
  return (await http.put<ApiResource<Department>>(`/departments/${id}`, payload)).data.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await http.delete(`/departments/${id}`);
}

export async function fetchSkills(search: string): Promise<{ id: number; name: string }[]> {
  return (
    await http.get<{ data: { id: number; name: string }[] }>('/skills', { params: { search } })
  ).data.data;
}

export async function fetchRecruiters(): Promise<AssignableUser[]> {
  return (await http.get<{ data: AssignableUser[] }>('/company/recruiters')).data.data;
}
