import type { EmploymentType } from '@/features/jobs/types';

export type OfferStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'withdrawn';

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Declined',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
};

export interface Offer {
  id: number;
  status: OfferStatus;
  status_label: string;
  salary_amount: number;
  currency: string;
  contract_type: EmploymentType;
  start_date: string;
  expires_at: string;
  message: string | null;
  internal_notes: string | null;
  approval_comment: string | null;
  response_note: string | null;
  application?: {
    id: number;
    status: string;
    job: { id: number; title: string };
    candidate: { id: number; full_name: string; email: string };
  };
  created_by?: { id: number; name: string } | null;
  approved_by?: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string | null;
}

export interface OfferPayload {
  application_id?: number;
  salary_amount: number;
  currency: string;
  contract_type: EmploymentType;
  start_date: string;
  expires_at: string;
  message: string | null;
  internal_notes: string | null;
}

export type OfferAction =
  'submit' | 'approve' | 'return' | 'send' | 'accept' | 'reject' | 'withdraw';

/** Offer as shown to the candidate (public link and candidate portal). */
export interface CandidateOffer {
  id: number;
  status: OfferStatus;
  salary_amount: number;
  currency: string;
  contract_type: EmploymentType;
  start_date: string;
  expires_at: string;
  message: string | null;
  sent_at: string | null;
  responded_at: string | null;
  job_title: string;
  company: { name: string; logo_url: string | null };
  candidate_first_name: string;
}
