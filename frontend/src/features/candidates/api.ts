import type { Application, Note } from '@/features/applications/types';
import { http } from '@/services/http';
import type { ApiResource, Paginated } from '@/types/api';
import type { Candidate, CandidateDocument, CandidatePayload, DuplicateMatch } from './types';

export interface CandidateListParams {
  page: number;
  per_page: number;
  search?: string;
  tag?: string;
  skill?: string;
  sort?: string;
}

export async function fetchCandidates(params: CandidateListParams): Promise<Paginated<Candidate>> {
  return (await http.get<Paginated<Candidate>>('/candidates', { params })).data;
}

export async function fetchCandidate(id: number): Promise<Candidate> {
  return (await http.get<ApiResource<Candidate>>(`/candidates/${id}`)).data.data;
}

export async function createCandidate(payload: CandidatePayload): Promise<Candidate> {
  return (await http.post<ApiResource<Candidate>>('/candidates', payload)).data.data;
}

export async function updateCandidate(id: number, payload: CandidatePayload): Promise<Candidate> {
  return (await http.put<ApiResource<Candidate>>(`/candidates/${id}`, payload)).data.data;
}

export async function deleteCandidate(id: number): Promise<void> {
  await http.delete(`/candidates/${id}`);
}

export async function fetchDuplicates(params: {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  ignore_id?: number;
}): Promise<DuplicateMatch[]> {
  return (await http.get<{ data: DuplicateMatch[] }>('/candidates/duplicates', { params })).data
    .data;
}

export async function fetchCandidateApplications(id: number): Promise<Application[]> {
  return (await http.get<{ data: Application[] }>(`/candidates/${id}/applications`)).data.data;
}

export async function fetchCandidateNotes(id: number): Promise<Note[]> {
  return (await http.get<{ data: Note[] }>(`/candidates/${id}/notes`)).data.data;
}

export async function addCandidateNote(id: number, body: string): Promise<Note> {
  return (await http.post<ApiResource<Note>>(`/candidates/${id}/notes`, { body })).data.data;
}

export async function uploadDocument(
  id: number,
  file: File,
  type: CandidateDocument['type'] = 'cv',
): Promise<CandidateDocument> {
  const body = new FormData();
  body.append('file', file);
  body.append('type', type);
  return (await http.post<ApiResource<CandidateDocument>>(`/candidates/${id}/documents`, body)).data
    .data;
}

export async function deleteDocument(candidateId: number, documentId: number): Promise<void> {
  await http.delete(`/candidates/${candidateId}/documents/${documentId}`);
}

/** Downloads through the authorized API endpoint (with the session cookie), then saves the file. */
export async function downloadDocument(document: CandidateDocument): Promise<void> {
  const response = await http.get<Blob>(document.download_url.replace(/^\/api\/v1/, ''), {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.original_name;
  link.rel = 'noopener';
  link.click();
  URL.revokeObjectURL(url);
}

export async function fetchTags(): Promise<{ id: number; name: string }[]> {
  return (await http.get<{ data: { id: number; name: string }[] }>('/tags')).data.data;
}
