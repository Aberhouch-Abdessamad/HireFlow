import { z } from 'zod';

const CV_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_CV_BYTES = 5 * 1024 * 1024;

export const applySchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required.').max(80),
  last_name: z.string().trim().min(1, 'Last name is required.').max(80),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === '' || /^[0-9+().\-\s]{6,40}$/.test(v), 'Enter a valid phone number.'),
  linkedin_url: z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === '' || /^https:\/\/.+/i.test(v), 'Enter a full https:// URL.'),
  cover_letter: z.string().trim().max(5000),
  cv: z
    .custom<File | null>()
    .refine((file) => file instanceof File, 'Attach your CV.')
    .refine(
      (file) => !(file instanceof File) || CV_TYPES.includes(file.type),
      'Upload a PDF or Word (.docx) file.',
    )
    .refine(
      (file) => !(file instanceof File) || file.size <= MAX_CV_BYTES,
      'Your CV must be 5 MB or smaller.',
    ),
  consent: z.boolean().refine((v) => v, 'Please agree to continue.'),
  website: z.string(),
});
