import type { EmploymentType, ExperienceLevel, WorkMode } from '@/features/jobs/types';

export interface PublicCompanyRef {
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface PublicJob {
  slug: string;
  title: string;
  location: string | null;
  work_mode: WorkMode;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  department: string | null;
  salary: { min: number | null; max: number | null; currency: string } | null;
  published_at: string | null;
  expires_at: string | null;
  company: PublicCompanyRef;
}

export interface PublicJobDetail extends PublicJob {
  description: string;
  requirements: string | null;
  skills: { name: string; is_required: boolean }[];
}

export interface PublicCompany {
  name: string;
  slug: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  country: string | null;
  description: string | null;
  logo_url: string | null;
  open_jobs_count: number;
}
