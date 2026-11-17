export type StageType =
  'applied' | 'screening' | 'shortlist' | 'interview' | 'assessment' | 'offer' | 'hired';
export type ApplicationStatus = 'active' | 'rejected' | 'withdrawn' | 'hired';
export type ApplicationSource =
  'careers_page' | 'manual' | 'referral' | 'linkedin' | 'agency' | 'other';
export type RejectionReason =
  | 'not_qualified'
  | 'insufficient_experience'
  | 'skills_mismatch'
  | 'culture_fit'
  | 'salary_expectations'
  | 'position_filled'
  | 'failed_assessment'
  | 'other';

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  not_qualified: 'Does not meet requirements',
  insufficient_experience: 'Insufficient experience',
  skills_mismatch: 'Skills mismatch',
  culture_fit: 'Team or culture fit',
  salary_expectations: 'Salary expectations',
  position_filled: 'Position filled',
  failed_assessment: 'Did not pass assessment',
  other: 'Other',
};

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  careers_page: 'Careers page',
  manual: 'Added manually',
  referral: 'Referral',
  linkedin: 'LinkedIn',
  agency: 'Agency',
  other: 'Other',
};

export const STAGE_TYPE_LABELS: Record<StageType, string> = {
  applied: 'Applied',
  screening: 'Screening',
  shortlist: 'Shortlist',
  interview: 'Interview',
  assessment: 'Assessment',
  offer: 'Offer',
  hired: 'Hired',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  active: 'Active',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  hired: 'Hired',
};

export interface Stage {
  id: number;
  name: string;
  type: StageType;
  position: number;
  is_system: boolean;
  applications_count?: number;
}

export interface Application {
  id: number;
  status: ApplicationStatus;
  source: ApplicationSource;
  cover_letter: string | null;
  stage?: { id: number; name: string; type: StageType };
  job?: { id: number; title: string; status: string };
  candidate?: {
    id: number;
    full_name: string;
    email: string;
    headline: string | null;
    location: string | null;
  };
  assignee?: { id: number; name: string } | null;
  rejection: {
    reason: RejectionReason | null;
    reason_label: string | null;
    note: string | null;
    rejected_at: string;
  } | null;
  applied_at: string | null;
  stage_entered_at: string | null;
  hired_at: string | null;
}

export interface StageHistoryEntry {
  id: number;
  from_stage: string | null;
  to_stage: string | null;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  performed_by: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface Note {
  id: number;
  body: string;
  author?: { id: number; name: string } | null;
  created_at: string | null;
}

export interface PipelineColumn {
  stage: Stage;
  applications: Application[];
}
