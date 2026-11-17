export type InterviewType = 'hr' | 'technical' | 'behavioral' | 'final';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled';
export type Recommendation = 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  hr: 'HR interview',
  technical: 'Technical interview',
  behavioral: 'Behavioral interview',
  final: 'Final interview',
};

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  strong_hire: 'Strong hire',
  hire: 'Hire',
  no_hire: 'No hire',
  strong_no_hire: 'Strong no hire',
};

export interface InterviewDocument {
  id: number;
  original_name: string;
  mime_type: string;
  size: number;
  download_url: string;
}

export interface Interview {
  id: number;
  type: InterviewType;
  type_label: string;
  status: InterviewStatus;
  scheduled_at: string;
  ends_at: string;
  duration_minutes: number;
  timezone: string;
  meeting_url: string | null;
  location: string | null;
  agenda: string | null;
  cancellation_reason: string | null;
  application?: {
    id: number;
    job: { id: number; title: string };
    candidate: { id: number; full_name: string; headline: string | null; email: string };
    stage: string | null;
    documents: InterviewDocument[];
  };
  participants?: { id: number; name: string; has_submitted_feedback: boolean | null }[];
  feedback_count?: number;
  scheduled_by?: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
}

export interface InterviewPayload {
  application_id?: number;
  type: InterviewType;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  meeting_url: string | null;
  location: string | null;
  agenda: string | null;
  participant_ids: number[];
  force?: boolean;
}

export interface Feedback {
  id: number;
  author?: { id: number; name: string };
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  overall_rating: number;
  recommendation: Recommendation;
  recommendation_label: string;
  comments: string | null;
  submitted_at: string | null;
}

export interface FeedbackPayload {
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  overall_rating: number;
  recommendation: Recommendation;
  comments: string | null;
}

export interface FeedbackList {
  data: Feedback[];
  meta: { can_see_all: boolean; can_submit: boolean; my_feedback_id: number | null };
}
