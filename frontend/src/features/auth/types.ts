import type { Permission, Role } from '@/types/permissions';

export interface CompanySummary {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
}

/** Payload of GET /api/v1/auth/me. Roles and permissions are for the active company only. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  is_super_admin: boolean;
  is_candidate: boolean;
  current_company: CompanySummary | null;
  roles: Role[];
  permissions: Permission[];
}
