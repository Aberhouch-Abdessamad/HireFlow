import { describe, expect, it } from 'vitest';
import { loginSchema, passwordSchema, registerSchema } from './schemas';

describe('auth schemas', () => {
  it('enforces the backend password policy', () => {
    expect(passwordSchema.safeParse('short1A').success).toBe(false);
    expect(passwordSchema.safeParse('alllowercase1').success).toBe(false);
    expect(passwordSchema.safeParse('NoNumbersHere').success).toBe(false);
    expect(passwordSchema.safeParse('Str0ngPassword').success).toBe(true);
  });

  it('requires matching password confirmation', () => {
    const result = registerSchema.safeParse({
      company_name: 'Acme',
      name: 'Ada',
      email: 'ada@acme.test',
      password: 'Str0ngPassword',
      password_confirmation: 'Different1Password',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['password_confirmation']);
  });

  it('validates login email format', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x', remember: false }).success).toBe(
      false,
    );
  });
});
