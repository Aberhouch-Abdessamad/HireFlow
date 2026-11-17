/**
 * Permission catalogue. It mirrors the backend permission enum, which is the source of truth.
 * The frontend only uses these values to show or hide UI. The API enforces every check.
 */
export const PERMISSIONS = [
  'jobs.view',
  'jobs.create',
  'jobs.update',
  'jobs.delete',
  'jobs.publish',
  'candidates.view',
  'candidates.create',
  'candidates.update',
  'candidates.delete',
  'applications.view',
  'applications.update_stage',
  'applications.assign',
  'applications.reject',
  'interviews.view',
  'interviews.schedule',
  'interviews.submit_feedback',
  'offers.view',
  'offers.create',
  'offers.send',
  'offers.approve',
  'analytics.view',
  'users.manage',
  'company.settings',
  'audit_logs.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  'super_admin',
  'company_admin',
  'hr_manager',
  'recruiter',
  'interviewer',
  'candidate',
] as const;

export type Role = (typeof ROLES)[number];
