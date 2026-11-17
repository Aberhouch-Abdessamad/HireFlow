import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  companies: () => [...authKeys.all, 'companies'] as const,
  recoveryCodes: () => [...authKeys.all, 'recovery-codes'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: api.fetchCurrentUser,
    staleTime: 5 * 60_000,
  });
}

export function useMyCompanies(enabled: boolean) {
  return useQuery({ queryKey: authKeys.companies(), queryFn: api.fetchMyCompanies, enabled });
}

/** Re-fetches the session after sign-in or company changes. */
export function useRefreshSession() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: authKeys.all });
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSettled: () => {
      // Drop all cached server data from the previous session (including other tenants' data).
      queryClient.clear();
      queryClient.setQueryData(authKeys.me(), null);
    },
  });
}

export function useSwitchCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.switchCompany,
    onSuccess: async () => {
      // Every cached query belongs to the previous company: reset everything.
      queryClient.removeQueries();
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}
