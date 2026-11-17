export interface DashboardRange {
  preset: string;
  from: string;
  to: string;
}

export interface DashboardOverview {
  kpi: {
    active_jobs: number;
    total_candidates: number;
    total_applications: number;
    scheduled_interviews: number;
    candidates_hired: number;
    rejection_rate: number | null;
    conversion_rate: number | null;
    avg_time_to_hire_days: number | null;
  };
  range: DashboardRange;
}

export interface PeriodParams {
  range?: 'today' | '7' | '30' | '90' | 'custom';
  from?: string;
  to?: string;
}

export interface MonthlySeriesItem {
  month: string;
  applications: number;
  hired: number;
  rejected: number;
}

export interface HiringFunnelStage {
  stage_type: string;
  applications: number;
}

export interface HiringFunnelCurrentStage {
  id: number;
  name: string;
  position: number;
  applications: number;
}

export interface HiringFunnelData {
  funnel: HiringFunnelStage[];
  stages: HiringFunnelCurrentStage[];
  statuses: Record<string, number>;
}

export interface JobDepartmentRow {
  department_id: number | null;
  name: string;
  jobs: number;
  published_jobs: number;
  applications: number;
}

export interface JobStatusSplit {
  by_department: JobDepartmentRow[];
  by_status: Record<string, number>;
}

export interface RecruiterPerformanceRow {
  user_id: number;
  name: string;
  assigned: number;
  hired: number;
  interviews_scheduled: number;
  offers_created: number;
  is_recruiter?: boolean;
}

export interface TimeToHireMonth {
  month: string;
  average_days: number | null;
  hires: number;
}

export interface DepartmentTimeToHire {
  department_id: number | null;
  name: string;
  average_days: number | null;
  hires: number;
}

export interface TimeToHireData {
  average_days: number | null;
  hires: number;
  per_month: TimeToHireMonth[];
  per_department: DepartmentTimeToHire[];
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read_at?: string | null;
  created_at?: string;
}

/** GET /dashboard/workspace: the signed-in member's own work. */
export interface Workspace {
  kpi: {
    assigned_active: number;
    new_this_week: number;
    stale: number;
    interviews_today: number;
    interviews_this_week: number;
    pending_feedback: number;
    offers_in_progress: number;
  };
  offers_by_status: Record<string, number>;
  pipeline: { id: number; name: string; type: string; count: number }[];
  needs_attention: {
    id: number;
    candidate: string;
    job: string;
    stage: string;
    stage_type: string;
    days_in_stage: number;
  }[];
  agenda: {
    id: number;
    candidate: string;
    job: string;
    type: string;
    type_label: string;
    scheduled_at: string;
    ends_at: string;
    meeting_url: string | null;
    location: string | null;
  }[];
  pending_feedback: { id: number; candidate: string; type_label: string; scheduled_at: string }[];
  jobs: {
    id: number;
    title: string;
    status: string;
    location: string | null;
    expires_at: string | null;
    active_applications: number;
    new_applications: number;
  }[];
}
