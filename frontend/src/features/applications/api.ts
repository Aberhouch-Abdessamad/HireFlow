import { http } from '@/services/http';
import type { ApiResource, Paginated } from '@/types/api';
import type {
  Application,
  ApplicationStatus,
  Note,
  PipelineColumn,
  RejectionReason,
  Stage,
  StageHistoryEntry,
  StageType,
} from './types';

export interface ApplicationListParams {
  page: number;
  per_page: number;
  job_id?: number;
  stage_id?: number;
  status?: ApplicationStatus;
  assigned_to?: string;
  search?: string;
  sort?: string;
}

export async function fetchApplications(
  params: ApplicationListParams,
): Promise<Paginated<Application>> {
  return (await http.get<Paginated<Application>>('/applications', { params })).data;
}

export async function fetchPipeline(jobId?: number): Promise<PipelineColumn[]> {
  return (
    await http.get<{ data: PipelineColumn[] }>('/applications/pipeline', {
      params: { job_id: jobId },
    })
  ).data.data;
}

export async function fetchApplication(id: number): Promise<Application> {
  return (await http.get<ApiResource<Application>>(`/applications/${id}`)).data.data;
}

export async function createApplication(payload: {
  candidate_id: number;
  job_id: number;
}): Promise<Application> {
  return (await http.post<ApiResource<Application>>('/applications', payload)).data.data;
}

export async function moveApplication(
  id: number,
  stageId: number,
  notes?: string,
): Promise<Application> {
  return (
    await http.post<ApiResource<Application>>(`/applications/${id}/stage`, {
      stage_id: stageId,
      notes: notes || null,
    })
  ).data.data;
}

export async function assignApplication(id: number, userId: number | null): Promise<Application> {
  return (
    await http.post<ApiResource<Application>>(`/applications/${id}/assign`, { user_id: userId })
  ).data.data;
}

export async function rejectApplication(
  id: number,
  reason: RejectionReason,
  note?: string,
): Promise<Application> {
  return (
    await http.post<ApiResource<Application>>(`/applications/${id}/reject`, {
      reason,
      note: note || null,
    })
  ).data.data;
}

export async function reopenApplication(id: number): Promise<Application> {
  return (await http.post<ApiResource<Application>>(`/applications/${id}/reopen`)).data.data;
}

export async function fetchApplicationHistory(id: number): Promise<StageHistoryEntry[]> {
  return (await http.get<{ data: StageHistoryEntry[] }>(`/applications/${id}/history`)).data.data;
}

export async function fetchApplicationNotes(id: number): Promise<Note[]> {
  return (await http.get<{ data: Note[] }>(`/applications/${id}/notes`)).data.data;
}

export async function addApplicationNote(id: number, body: string): Promise<Note> {
  return (await http.post<ApiResource<Note>>(`/applications/${id}/notes`, { body })).data.data;
}

export async function fetchStages(): Promise<Stage[]> {
  return (await http.get<{ data: Stage[] }>('/recruitment-stages')).data.data;
}

export async function createStage(payload: {
  name: string;
  type: StageType;
  position: number;
}): Promise<Stage> {
  return (await http.post<ApiResource<Stage>>('/recruitment-stages', payload)).data.data;
}

export async function updateStage(
  id: number,
  payload: { name: string; position?: number },
): Promise<Stage> {
  return (await http.put<ApiResource<Stage>>(`/recruitment-stages/${id}`, payload)).data.data;
}

export async function deleteStage(id: number): Promise<void> {
  await http.delete(`/recruitment-stages/${id}`);
}
