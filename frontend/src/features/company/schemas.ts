import { z } from 'zod';

export const inviteSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  role: z.enum(['company_admin', 'hr_manager', 'recruiter', 'interviewer'], {
    error: 'Choose a role.',
  }),
});
export type InviteValues = z.infer<typeof inviteSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable();

export const companySchema = z.object({
  name: z.string().trim().min(2, 'Company name is required.').max(120),
  website: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^https?:\/\/.+/i.test(value),
      'Enter a full URL, e.g. https://example.com',
    )
    .transform((value) => (value === '' ? null : value))
    .nullable(),
  industry: optionalText(100),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).nullable(),
  country: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^[A-Za-z]{2}$/.test(value),
      'Use a 2-letter country code, e.g. MA',
    )
    .transform((value) => (value === '' ? null : value.toUpperCase()))
    .nullable(),
  timezone: z.string().min(1, 'Timezone is required.'),
  description: optionalText(5000),
});
export type CompanyFormInput = z.input<typeof companySchema>;
export type CompanyFormOutput = z.output<typeof companySchema>;
