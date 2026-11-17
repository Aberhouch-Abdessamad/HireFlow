import { z } from 'zod';

/** Matches the backend password policy (Password::defaults): 10+ characters, mixed case, a number. */
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .regex(/[a-z]/, 'Add a lowercase letter.')
  .regex(/[A-Z]/, 'Add an uppercase letter.')
  .regex(/[0-9]/, 'Add a number.');

const email = z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.');

const passwordFields = { password: passwordSchema, password_confirmation: z.string() };

const passwordsMatch: [
  (data: { password: string; password_confirmation: string }) => boolean,
  { path: PropertyKey[]; message: string },
] = [
  (data) => data.password === data.password_confirmation,
  { path: ['password_confirmation'], message: 'Passwords do not match.' },
];

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
  remember: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    company_name: z.string().trim().min(2, 'Company name is required.').max(120),
    name: z.string().trim().min(1, 'Your name is required.').max(120),
    email,
    ...passwordFields,
  })
  .refine(...passwordsMatch);
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({ email, ...passwordFields }).refine(...passwordsMatch);
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const twoFactorSchema = z.object({
  code: z.string().trim(),
  recovery_code: z.string().trim(),
});
export type TwoFactorValues = z.infer<typeof twoFactorSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    ...passwordFields,
  })
  .refine(...passwordsMatch);
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const acceptInvitationSchema = z
  .object({ name: z.string().trim().min(1, 'Your name is required.').max(120), ...passwordFields })
  .refine(...passwordsMatch);
export type AcceptInvitationValues = z.infer<typeof acceptInvitationSchema>;
