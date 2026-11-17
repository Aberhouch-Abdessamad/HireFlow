import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toApiError } from './apiError';

/**
 * Central HTTP client for the HireFlow API.
 *
 * Authentication uses Laravel Sanctum SPA sessions: an HttpOnly session cookie plus the
 * XSRF-TOKEN cookie, which Axios sends back as the X-XSRF-TOKEN header. No auth token is
 * ever read or written by JavaScript, and nothing is stored in localStorage.
 */
export const http = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 30_000,
});

/** Initialises the CSRF cookie. Call before the first state-changing request (e.g. login). */
export async function ensureCsrfCookie(): Promise<void> {
  await axios.get('/sanctum/csrf-cookie', {
    withCredentials: true,
    headers: { Accept: 'application/json' },
  });
}

type UnauthenticatedHandler = () => void;
let unauthenticatedHandler: UnauthenticatedHandler | null = null;

/** Lets the auth layer react to 401s (e.g. clear the session and redirect) without a circular import. */
export function onUnauthenticated(handler: UnauthenticatedHandler | null): void {
  unauthenticatedHandler = handler;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _csrfRetried?: boolean;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as RetriableConfig | undefined;

    // 419 = CSRF token mismatch (e.g. the token expired). Refresh it once and retry.
    if (status === 419 && config && !config._csrfRetried) {
      config._csrfRetried = true;
      await ensureCsrfCookie();
      return http.request(config);
    }

    if (status === 401) {
      unauthenticatedHandler?.();
    }

    return Promise.reject(toApiError(error));
  },
);
