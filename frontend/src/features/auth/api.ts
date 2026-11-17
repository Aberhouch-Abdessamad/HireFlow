import { ApiError } from '@/services/apiError';
import { ensureCsrfCookie, http } from '@/services/http';
import type { ApiResource } from '@/types/api';
import type { CompanySummary, AuthUser } from './types';

/** Returns the authenticated user, or null when there is no session. */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await http.get<ApiResource<AuthUser>>('/auth/me');
    return response.data.data;
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) {
      return null;
    }
    throw error;
  }
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResult {
  twoFactor: boolean;
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  await ensureCsrfCookie();
  const response = await http.post<{ two_factor?: boolean }>('/auth/login', payload);
  return { twoFactor: response.data.two_factor === true };
}

export async function twoFactorChallenge(
  payload: { code: string } | { recovery_code: string },
): Promise<void> {
  await http.post('/auth/two-factor-challenge', payload);
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout');
}

export interface RegisterPayload {
  company_name: string;
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export async function register(payload: RegisterPayload): Promise<void> {
  await ensureCsrfCookie();
  await http.post('/auth/register', payload);
}

export async function forgotPassword(email: string): Promise<string> {
  await ensureCsrfCookie();
  const response = await http.post<{ message: string }>('/auth/forgot-password', { email });
  return response.data.message;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await ensureCsrfCookie();
  await http.post('/auth/reset-password', payload);
}

export async function updateProfile(payload: { name: string }): Promise<AuthUser> {
  const response = await http.put<ApiResource<AuthUser>>('/auth/profile', payload);
  return response.data.data;
}

export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export async function updatePassword(payload: UpdatePasswordPayload): Promise<void> {
  await http.put('/auth/user/password', payload);
}

export async function confirmPassword(password: string): Promise<void> {
  await http.post('/auth/user/confirm-password', { password });
}

export async function enableTwoFactor(): Promise<void> {
  await http.post('/auth/user/two-factor-authentication');
}

export async function fetchTwoFactorQrCode(): Promise<string> {
  const response = await http.get<{ svg: string }>('/auth/user/two-factor-qr-code');
  return response.data.svg;
}

export async function confirmTwoFactor(code: string): Promise<void> {
  await http.post('/auth/user/confirmed-two-factor-authentication', { code });
}

export async function fetchRecoveryCodes(): Promise<string[]> {
  const response = await http.get<string[]>('/auth/user/two-factor-recovery-codes');
  return response.data;
}

export async function regenerateRecoveryCodes(): Promise<void> {
  await http.post('/auth/user/two-factor-recovery-codes');
}

export async function disableTwoFactor(): Promise<void> {
  await http.delete('/auth/user/two-factor-authentication');
}

export async function fetchMyCompanies(): Promise<CompanySummary[]> {
  const response = await http.get<{ data: CompanySummary[] }>('/auth/companies');
  return response.data.data;
}

export async function switchCompany(companyId: number): Promise<void> {
  await http.post('/company/switch', { company_id: companyId });
}
