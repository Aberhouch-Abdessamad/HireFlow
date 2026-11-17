import { ensureCsrfCookie, http } from '@/services/http';
import type { ApiResource } from '@/types/api';
import type { HealthStatus } from './types';

export async function fetchHealth(): Promise<HealthStatus> {
  const response = await http.get<ApiResource<HealthStatus>>('/health');
  return response.data.data;
}

/**
 * Asks Sanctum for a CSRF cookie and checks that the browser received it.
 * XSRF-TOKEN is meant to be readable by JS. The session cookie is HttpOnly and never visible.
 */
export async function checkCsrfCookie(): Promise<boolean> {
  await ensureCsrfCookie();
  return document.cookie.split('; ').some((cookie) => cookie.startsWith('XSRF-TOKEN='));
}
