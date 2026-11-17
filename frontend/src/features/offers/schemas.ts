import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { z } from 'zod';

export const offerFormSchema = z
  .object({
    salary_amount: z
      .number({ error: 'Enter the yearly salary.' })
      .int()
      .min(1, 'Enter the yearly salary.')
      .max(100_000_000),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code, e.g. EUR.'),
    contract_type: z.enum(['full_time', 'part_time', 'internship', 'contract', 'freelance']),
    start_date: z.custom<Dayjs | null>().refine((v) => v !== null, 'Choose a start date.'),
    expires_at: z.custom<Dayjs | null>().refine((v) => v !== null, 'Choose a response deadline.'),
    message: z.string().trim().max(5000),
    internal_notes: z.string().trim().max(5000),
  })
  .superRefine((v, ctx) => {
    if (v.start_date && !v.start_date.isAfter(dayjs(), 'day')) {
      ctx.addIssue({
        code: 'custom',
        path: ['start_date'],
        message: 'The start date must be in the future.',
      });
    }
    if (v.expires_at && !v.expires_at.isAfter(dayjs())) {
      ctx.addIssue({
        code: 'custom',
        path: ['expires_at'],
        message: 'The deadline must be in the future.',
      });
    }
    if (v.start_date && v.expires_at && !v.expires_at.isBefore(v.start_date, 'day')) {
      ctx.addIssue({
        code: 'custom',
        path: ['expires_at'],
        message: 'The deadline must be before the start date.',
      });
    }
  });

export type OfferFormInput = z.input<typeof offerFormSchema>;
export type OfferFormValues = z.output<typeof offerFormSchema>;
