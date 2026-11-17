import { z } from 'zod';
import type { Candidate, CandidatePayload } from './types';

const optional = (max: number) => z.string().trim().max(max);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const candidateFormSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required.').max(80),
  last_name: z.string().trim().min(1, 'Last name is required.').max(80),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  phone: optional(40).refine(
    (v) => v === '' || /^[0-9+().\-\s]{6,40}$/.test(v),
    'Enter a valid phone number.',
  ),
  location: optional(150),
  headline: optional(150),
  linkedin_url: optional(255).refine(
    (v) => v === '' || /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(v),
    'Enter a LinkedIn URL (https://linkedin.com/…).',
  ),
  portfolio_url: optional(255).refine(
    (v) => v === '' || /^https?:\/\/.+/i.test(v),
    'Enter a full URL.',
  ),
  skills: z.array(z.string().trim().min(1).max(80)).max(50),
  tags: z.array(z.string().trim().min(1).max(50)).max(20),
  experiences: z
    .array(
      z
        .object({
          company_name: z.string().trim().min(1, 'Company is required.').max(120),
          title: z.string().trim().min(1, 'Title is required.').max(120),
          start_date: isoDate,
          end_date: isoDate,
          is_current: z.boolean(),
          description: optional(2000),
        })
        .refine((e) => !e.start_date || !e.end_date || e.end_date >= e.start_date, {
          path: ['end_date'],
          message: 'End date must be after the start date.',
        }),
    )
    .max(30),
  educations: z
    .array(
      z.object({
        institution: z.string().trim().min(1, 'Institution is required.').max(150),
        degree: optional(120),
        field_of_study: optional(120),
        start_date: isoDate,
        end_date: isoDate,
      }),
    )
    .max(20),
});

export type CandidateFormValues = z.infer<typeof candidateFormSchema>;

export const emptyCandidateForm: CandidateFormValues = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  location: '',
  headline: '',
  linkedin_url: '',
  portfolio_url: '',
  skills: [],
  tags: [],
  experiences: [],
  educations: [],
};

export function candidateToForm(candidate: Candidate): CandidateFormValues {
  return {
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    email: candidate.email,
    phone: candidate.phone ?? '',
    location: candidate.location ?? '',
    headline: candidate.headline ?? '',
    linkedin_url: candidate.linkedin_url ?? '',
    portfolio_url: candidate.portfolio_url ?? '',
    skills: candidate.skills ?? [],
    tags: candidate.tags ?? [],
    experiences: (candidate.experiences ?? []).map((e) => ({
      company_name: e.company_name,
      title: e.title,
      start_date: e.start_date,
      end_date: e.end_date,
      is_current: e.is_current,
      description: e.description ?? '',
    })),
    educations: (candidate.educations ?? []).map((e) => ({
      institution: e.institution,
      degree: e.degree ?? '',
      field_of_study: e.field_of_study ?? '',
      start_date: e.start_date,
      end_date: e.end_date,
    })),
  };
}

const nullIfEmpty = (value: string) => (value === '' ? null : value);

export function formToPayload(values: CandidateFormValues): CandidatePayload {
  return {
    first_name: values.first_name,
    last_name: values.last_name,
    email: values.email,
    phone: nullIfEmpty(values.phone),
    location: nullIfEmpty(values.location),
    headline: nullIfEmpty(values.headline),
    linkedin_url: nullIfEmpty(values.linkedin_url),
    portfolio_url: nullIfEmpty(values.portfolio_url),
    skills: values.skills,
    tags: values.tags,
    experiences: values.experiences.map((e) => ({
      ...e,
      end_date: e.is_current ? null : e.end_date,
      description: nullIfEmpty(e.description),
    })),
    educations: values.educations.map((e) => ({
      ...e,
      degree: nullIfEmpty(e.degree),
      field_of_study: nullIfEmpty(e.field_of_study),
    })),
  };
}
