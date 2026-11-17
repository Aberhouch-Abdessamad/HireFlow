import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/services/apiError';

const MAX_RETRIES = 2;

/** Retry only transient failures (network errors and 5xx). Never retry 4xx responses. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) {
    return false;
  }
  if (error instanceof ApiError) {
    return error.isNetwork || error.status >= 500;
  }
  return false;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
