import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import type { JobPayload, JobPosting } from './types';

const nullableNumber = z.number().int().min(0).max(100_000_000).nullable();

export const jobFormSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(150),
    department_id: z.number().int().nullable(),
    location: z.string().trim().max(150),
    work_mode: z.enum(['onsite', 'hybrid', 'remote']),
    employment_type: z.enum(['full_time', 'part_time', 'internship', 'contract', 'freelance']),
    experience_level: z.enum(['entry', 'junior', 'mid', 'senior', 'lead', 'executive']),
    description: z
      .string()
      .trim()
      .min(20, 'Describe the role in at least 20 characters.')
      .max(20000),
    requirements: z.string().trim().max(20000),
    salary_min: nullableNumber,
    salary_max: nullableNumber,
    salary_currency: z.string().trim().toUpperCase(),
    salary_visible: z.boolean(),
    expires_at: z.custom<Dayjs | null>(),
    recruiter_ids: z.array(z.number().int()).max(20),
    required_skills: z.array(z.string().trim().min(1).max(80)).max(30),
    preferred_skills: z.array(z.string().trim().min(1).max(80)).max(30),
  })
  .superRefine((values, ctx) => {
    if (
      values.salary_min !== null &&
      values.salary_max !== null &&
      values.salary_max < values.salary_min
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['salary_max'],
        message: 'Maximum must be greater than or equal to minimum.',
      });
    }
    const hasSalary = values.salary_min !== null || values.salary_max !== null;
    if (hasSalary && !/^[A-Z]{3}$/.test(values.salary_currency)) {
      ctx.addIssue({
        code: 'custom',
        path: ['salary_currency'],
        message: 'Use a 3-letter currency code, e.g. EUR.',
      });
    }
    if (values.expires_at && !values.expires_at.isAfter(new Date())) {
      ctx.addIssue({
        code: 'custom',
        path: ['expires_at'],
        message: 'The expiration date must be in the future.',
      });
    }
    if (values.required_skills.length + values.preferred_skills.length > 30) {
      ctx.addIssue({
        code: 'custom',
        path: ['preferred_skills'],
        message: 'Use at most 30 skills in total.',
      });
    }
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;

export const emptyJobForm: JobFormValues = {
  title: '',
  department_id: null,
  location: '',
  work_mode: 'onsite',
  employment_type: 'full_time',
  experience_level: 'mid',
  description: '',
  requirements: '',
  salary_min: null,
  salary_max: null,
  salary_currency: 'EUR',
  salary_visible: false,
  expires_at: null,
  recruiter_ids: [],
  required_skills: [],
  preferred_skills: [],
};

export function jobToFormValues(job: JobPosting, toDayjs: (value: string) => Dayjs): JobFormValues {
  const skills = job.skills ?? [];
  return {
    title: job.title,
    department_id: job.department?.id ?? null,
    location: job.location ?? '',
    work_mode: job.work_mode,
    employment_type: job.employment_type,
    experience_level: job.experience_level,
    description: job.description,
    requirements: job.requirements ?? '',
    salary_min: job.salary.min,
    salary_max: job.salary.max,
    salary_currency: job.salary.currency ?? 'EUR',
    salary_visible: job.salary.visible,
    expires_at: job.expires_at ? toDayjs(job.expires_at) : null,
    recruiter_ids: (job.recruiters ?? []).map((recruiter) => recruiter.id),
    required_skills: skills.filter((skill) => skill.is_required).map((skill) => skill.name),
    preferred_skills: skills.filter((skill) => !skill.is_required).map((skill) => skill.name),
  };
}

export function formValuesToPayload(values: JobFormValues): JobPayload {
  const hasSalary = values.salary_min !== null || values.salary_max !== null;
  const seen = new Set<string>();
  const skills = [
    ...values.required_skills.map((name) => ({ name, is_required: true })),
    ...values.preferred_skills.map((name) => ({ name, is_required: false })),
  ].filter((skill) => {
    const key = skill.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    title: values.title,
    department_id: values.department_id,
    location: values.location || null,
    work_mode: values.work_mode,
    employment_type: values.employment_type,
    experience_level: values.experience_level,
    description: values.description,
    requirements: values.requirements || null,
    salary_min: values.salary_min,
    salary_max: values.salary_max,
    salary_currency: hasSalary ? values.salary_currency : null,
    salary_visible: hasSalary && values.salary_visible,
    expires_at: values.expires_at ? values.expires_at.endOf('day').toISOString() : null,
    recruiter_ids: values.recruiter_ids,
    skills,
  };
}
