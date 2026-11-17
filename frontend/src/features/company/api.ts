import { ensureCsrfCookie, http } from '@/services/http';
import type { ApiResource, Paginated } from '@/types/api';
import type {
  Company,
  CompanyRole,
  Invitation,
  InvitationPreview,
  Member,
  MembershipStatus,
} from './types';

export async function fetchCompany(): Promise<Company> {
  return (await http.get<ApiResource<Company>>('/company')).data.data;
}

export type CompanyUpdate = Pick<Company, 'name' | 'timezone'> &
  Partial<Pick<Company, 'website' | 'industry' | 'size' | 'country' | 'description'>>;

export async function updateCompany(payload: CompanyUpdate): Promise<Company> {
  return (await http.put<ApiResource<Company>>('/company', payload)).data.data;
}

export interface MemberListParams {
  page: number;
  per_page: number;
  search?: string;
  status?: MembershipStatus;
}

export async function fetchMembers(params: MemberListParams): Promise<Paginated<Member>> {
  return (await http.get<Paginated<Member>>('/company/members', { params })).data;
}

export async function updateMemberRole(id: number, role: CompanyRole): Promise<Member> {
  return (await http.put<ApiResource<Member>>(`/company/members/${id}/role`, { role })).data.data;
}

export async function deactivateMember(id: number): Promise<Member> {
  return (await http.delete<ApiResource<Member>>(`/company/members/${id}`)).data.data;
}

export async function activateMember(id: number): Promise<Member> {
  return (await http.post<ApiResource<Member>>(`/company/members/${id}/activate`)).data.data;
}

export async function fetchInvitations(): Promise<Invitation[]> {
  return (await http.get<{ data: Invitation[] }>('/company/invitations')).data.data;
}

export async function createInvitation(payload: {
  email: string;
  role: CompanyRole;
}): Promise<Invitation> {
  return (await http.post<ApiResource<Invitation>>('/company/invitations', payload)).data.data;
}

export async function revokeInvitation(id: number): Promise<void> {
  await http.delete(`/company/invitations/${id}`);
}

export async function fetchInvitationPreview(token: string): Promise<InvitationPreview> {
  return (
    await http.get<ApiResource<InvitationPreview>>(`/invitations/${encodeURIComponent(token)}`)
  ).data.data;
}

export async function acceptInvitation(
  token: string,
  payload:
    { name: string; password: string; password_confirmation: string } | Record<string, never>,
): Promise<void> {
  await ensureCsrfCookie();
  await http.post(`/invitations/${encodeURIComponent(token)}/accept`, payload);
}

export async function uploadCompanyLogo(file: File): Promise<Company> {
  const body = new FormData();
  body.append('logo', file);
  return (await http.post<ApiResource<Company>>('/company/logo', body)).data.data;
}

export async function removeCompanyLogo(): Promise<Company> {
  return (await http.delete<ApiResource<Company>>('/company/logo')).data.data;
}
