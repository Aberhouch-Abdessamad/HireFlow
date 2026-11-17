import type { Role } from '@/types/permissions';

export type CompanyRole = Exclude<Role, 'super_admin' | 'candidate'>;

export const COMPANY_ROLE_OPTIONS: { value: CompanyRole; label: string }[] = [
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'interviewer', label: 'Interviewer' },
];

export interface Company {
  id: number;
  name: string;
  slug: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  country: string | null;
  timezone: string;
  description: string | null;
  logo_url: string | null;
  created_at: string | null;
}

export type MembershipStatus = 'active' | 'deactivated';

export interface Member {
  id: number;
  status: MembershipStatus;
  job_title: string | null;
  joined_at: string | null;
  role: CompanyRole | null;
  role_label: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    last_login_at: string | null;
  };
}

export interface Invitation {
  id: number;
  email: string;
  role: CompanyRole;
  role_label: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invited_by?: string | null;
  expires_at: string;
  created_at: string | null;
}

export interface InvitationPreview {
  company: { name: string };
  email: string;
  role: CompanyRole;
  role_label: string;
  expires_at: string;
  account_exists: boolean;
}
