import type { ApplicationSource } from '@/features/applications/types';

export interface CandidateExperience {
  id?: number;
  company_name: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface CandidateEducation {
  id?: number;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface CandidateDocument {
  id: number;
  type: 'cv' | 'cover_letter' | 'portfolio' | 'other';
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_by?: string | null;
  download_url: string;
  created_at: string | null;
}

export interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  headline: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  source: ApplicationSource;
  skills?: string[];
  tags?: string[];
  experiences?: CandidateExperience[];
  educations?: CandidateEducation[];
  documents?: CandidateDocument[];
  applications_count?: number;
  created_by?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CandidatePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  headline: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  source?: ApplicationSource;
  skills: string[];
  tags: string[];
  experiences: Omit<CandidateExperience, 'id'>[];
  educations: Omit<CandidateEducation, 'id'>[];
}

export interface DuplicateMatch {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  headline: string | null;
}
