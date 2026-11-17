import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { CompanyRole } from './types';

export const companyKeys = {
  all: ['company'] as const,
  profile: () => [...companyKeys.all, 'profile'] as const,
  members: (params: api.MemberListParams) => [...companyKeys.all, 'members', params] as const,
  invitations: () => [...companyKeys.all, 'invitations'] as const,
  invitationPreview: (token: string) => ['invitation-preview', token] as const,
};

export function useCompany() {
  return useQuery({ queryKey: companyKeys.profile(), queryFn: api.fetchCompany });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateCompany,
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.profile(), company);
      void queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useMembers(params: api.MemberListParams) {
  return useQuery({
    queryKey: companyKeys.members(params),
    queryFn: () => api.fetchMembers(params),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateMembers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [...companyKeys.all, 'members'] });
}

export function useUpdateMemberRole() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: CompanyRole }) => api.updateMemberRole(id, role),
    onSuccess: () => invalidate(),
  });
}

export function useSetMemberActive() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? api.activateMember(id) : api.deactivateMember(id),
    onSuccess: () => invalidate(),
  });
}

export function useInvitations(enabled = true) {
  return useQuery({ queryKey: companyKeys.invitations(), queryFn: api.fetchInvitations, enabled });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyKeys.invitations() }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.revokeInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyKeys.invitations() }),
  });
}

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: companyKeys.invitationPreview(token),
    queryFn: () => api.fetchInvitationPreview(token),
    retry: false,
  });
}

export function useCompanyLogo() {
  const queryClient = useQueryClient();
  const onSuccess = (company: Awaited<ReturnType<typeof api.fetchCompany>>) => {
    queryClient.setQueryData(companyKeys.profile(), company);
    void queryClient.invalidateQueries({ queryKey: ['auth'] });
  };
  return {
    upload: useMutation({ mutationFn: api.uploadCompanyLogo, onSuccess }),
    remove: useMutation({ mutationFn: api.removeCompanyLogo, onSuccess }),
  };
}
