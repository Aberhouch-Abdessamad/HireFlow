import { useQuery } from '@tanstack/react-query';
import { checkCsrfCookie, fetchHealth } from './api';

export const systemKeys = {
  all: ['system'] as const,
  health: () => [...systemKeys.all, 'health'] as const,
  csrf: () => [...systemKeys.all, 'csrf'] as const,
};

export function useHealth() {
  return useQuery({ queryKey: systemKeys.health(), queryFn: fetchHealth, staleTime: 0 });
}

export function useCsrfCheck() {
  return useQuery({ queryKey: systemKeys.csrf(), queryFn: checkCsrfCookie, staleTime: 0 });
}
