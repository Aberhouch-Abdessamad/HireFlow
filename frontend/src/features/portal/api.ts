import type { CandidateOffer } from '@/features/offers/types';
import { ensureCsrfCookie, http } from '@/services/http';
import type { ApiResource } from '@/types/api';
import type { PortalApplication, PortalDocument, PortalProfile } from './types';

export async function registerCandidate(payload: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await ensureCsrfCookie();
  await http.post('/candidate/register', payload);
}

export async function fetchMyApplications(): Promise<PortalApplication[]> {
  return (await http.get<{ data: PortalApplication[] }>('/candidate/applications')).data.data;
}

export async function fetchMyApplication(id: number): Promise<PortalApplication> {
  return (await http.get<ApiResource<PortalApplication>>(`/candidate/applications/${id}`)).data
    .data;
}

export async function fetchMyOffers(): Promise<CandidateOffer[]> {
  return (await http.get<{ data: CandidateOffer[] }>('/candidate/offers')).data.data;
}

export async function respondToOffer(
  id: number,
  decision: 'accept' | 'decline',
  note: string | null,
): Promise<CandidateOffer> {
  return (
    await http.post<ApiResource<CandidateOffer>>(`/candidate/offers/${id}/${decision}`, { note })
  ).data.data;
}

export async function fetchMyProfile(): Promise<PortalProfile> {
  return (await http.get<ApiResource<PortalProfile>>('/candidate/profile')).data.data;
}

export async function updateMyProfile(
  payload: Omit<PortalProfile, 'email' | 'linked_companies'>,
): Promise<PortalProfile> {
  return (await http.put<ApiResource<PortalProfile>>('/candidate/profile', payload)).data.data;
}

export async function fetchMyDocuments(): Promise<PortalDocument[]> {
  return (await http.get<{ data: PortalDocument[] }>('/candidate/documents')).data.data;
}

export async function uploadMyDocument(applicationId: number, file: File): Promise<void> {
  const body = new FormData();
  body.append('application_id', String(applicationId));
  body.append('file', file);
  await http.post('/candidate/documents', body);
}

export async function downloadMyDocument(doc: PortalDocument): Promise<void> {
  const response = await http.get<Blob>(doc.download_url.replace(/^\/api\/v1/, ''), {
    responseType: 'blob',
  });
  const href = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = href;
  link.download = doc.original_name;
  link.click();
  URL.revokeObjectURL(href);
}
