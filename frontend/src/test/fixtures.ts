import type { AuthUser } from '@/features/auth/types';

export function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    name: 'Test Recruiter',
    email: 'recruiter@example.test',
    email_verified: true,
    two_factor_enabled: false,
    is_super_admin: false,
    is_candidate: false,
    current_company: { id: 10, name: 'Acme Test Co', slug: 'acme-test-co', logo_url: null },
    roles: ['recruiter'],
    permissions: ['jobs.view', 'candidates.view', 'applications.view'],
    ...overrides,
  };
}
