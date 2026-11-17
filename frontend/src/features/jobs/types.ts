export type JobStatus = 'draft' | 'published' | 'paused' | 'closed' | 'archived';
export type EmploymentType = 'full_time' | 'part_time' | 'internship' | 'contract' | 'freelance';
export type ExperienceLevel = 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
export type WorkMode = 'onsite' | 'hybrid' | 'remote';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  paused: 'Paused',
  closed: 'Closed',
  archived: 'Archived',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  internship: 'Internship',
  contract: 'Contract',
  freelance: 'Freelance',
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Entry level',
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead / Principal',
  executive: 'Executive',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

export function toOptions<T extends string>(
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export interface Salary {
  min: number | null;
  max: number | null;
  currency: string | null;
  visible: boolean;
}

export interface JobSkill {
  id: number;
  name: string;
  is_required: boolean;
}

export interface JobPosting {
  id: number;
  slug: string;
  title: string;
  description: string;
  requirements: string | null;
  location: string | null;
  work_mode: WorkMode;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  salary: Salary;
  status: JobStatus;
  available_transitions: JobStatus[];
  is_editable: boolean;
  is_deletable: boolean;
  department?: { id: number; name: string } | null;
  recruiters?: { id: number; name: string }[];
  skills?: JobSkill[];
  created_by?: string | null;
  published_at: string | null;
  expires_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface JobPayload {
  title: string;
  description: string;
  requirements: string | null;
  location: string | null;
  work_mode: WorkMode;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  department_id: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_visible: boolean;
  expires_at: string | null;
  recruiter_ids: number[];
  skills: { name: string; is_required: boolean }[];
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  job_postings_count?: number;
  created_at: string | null;
}

export interface AssignableUser {
  id: number;
  name: string;
  email: string;
}

export type JobTransition = 'publish' | 'pause' | 'close' | 'archive';

export const TRANSITION_FOR_STATUS: Partial<Record<JobStatus, JobTransition>> = {
  published: 'publish',
  paused: 'pause',
  closed: 'close',
  archived: 'archive',
};
