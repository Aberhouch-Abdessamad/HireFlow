export type Progress =
  'received' | 'in_review' | 'interviewing' | 'offer' | 'hired' | 'not_selected' | 'withdrawn';

export const PROGRESS_LABELS: Record<Progress, string> = {
  received: 'Application received',
  in_review: 'In review',
  interviewing: 'Interviewing',
  offer: 'Offer',
  hired: 'Hired',
  not_selected: 'Not selected',
  withdrawn: 'Withdrawn',
};

export const PROGRESS_STEPS: Progress[] = [
  'received',
  'in_review',
  'interviewing',
  'offer',
  'hired',
];

export interface PortalInterview {
  id: number;
  type_label: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  location: string | null;
}

export interface PortalApplication {
  id: number;
  progress: Progress;
  applied_at: string | null;
  job: { title: string; slug: string; location: string | null };
  company: { name: string; slug: string; logo_url: string | null };
  upcoming_interviews?: PortalInterview[];
}

export interface PortalProfile {
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  linked_companies: string[];
}

export interface PortalDocument {
  id: number;
  original_name: string;
  mime_type: string;
  size: number;
  company: string;
  created_at: string | null;
  download_url: string;
}
