import type { Dayjs } from 'dayjs';
import { z } from 'zod';

export const interviewFormSchema = z
  .object({
    type: z.enum(['hr', 'technical', 'behavioral', 'final']),
    start: z.custom<Dayjs | null>().refine((v) => v !== null, 'Choose a date and time.'),
    duration_minutes: z.number().int().min(15, 'At least 15 minutes.').max(480, 'At most 8 hours.'),
    meeting_url: z
      .string()
      .trim()
      .max(255)
      .refine((v) => v === '' || /^https:\/\/.+/i.test(v), 'Use a secure https:// link.'),
    location: z.string().trim().max(200),
    agenda: z.string().trim().max(5000),
    participant_ids: z.array(z.number().int()).min(1, 'Add at least one interviewer.').max(10),
  })
  .superRefine((values, ctx) => {
    if (values.start && !values.start.isAfter(new Date())) {
      ctx.addIssue({ code: 'custom', path: ['start'], message: 'Choose a time in the future.' });
    }
    if (!values.meeting_url && !values.location) {
      ctx.addIssue({
        code: 'custom',
        path: ['meeting_url'],
        message: 'Add a meeting link or a location.',
      });
    }
  });

export type InterviewFormInput = z.input<typeof interviewFormSchema>;
export type InterviewFormValues = z.output<typeof interviewFormSchema>;

export const feedbackSchema = z.object({
  technical_score: z.number().int().min(1, 'Rate from 1 to 5.').max(5),
  communication_score: z.number().int().min(1, 'Rate from 1 to 5.').max(5),
  problem_solving_score: z.number().int().min(1, 'Rate from 1 to 5.').max(5),
  overall_rating: z.number().int().min(1, 'Rate from 1 to 5.').max(5),
  recommendation: z.enum(['strong_hire', 'hire', 'no_hire', 'strong_no_hire'], {
    error: 'Choose a recommendation.',
  }),
  comments: z.string().trim().max(5000),
});

export type FeedbackValues = z.infer<typeof feedbackSchema>;
