import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { emptyJobForm, formValuesToPayload, jobFormSchema } from './schemas';

const valid = {
  ...emptyJobForm,
  title: 'Backend Engineer',
  description: 'Build robust APIs for our recruitment platform.',
};

describe('job form schema', () => {
  it('accepts a minimal valid job', () => {
    expect(jobFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects inverted salary ranges and past expiration dates', () => {
    const result = jobFormSchema.safeParse({
      ...valid,
      salary_min: 80000,
      salary_max: 50000,
      expires_at: dayjs().subtract(1, 'day'),
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toContain('salary_max');
    expect(paths).toContain('expires_at');
  });
});

describe('formValuesToPayload', () => {
  it('merges skills without duplicates and drops currency without salary', () => {
    const payload = formValuesToPayload({
      ...valid,
      required_skills: ['Laravel', 'React'],
      preferred_skills: ['laravel', 'Docker'],
      salary_visible: true,
    });

    expect(payload.skills).toEqual([
      { name: 'Laravel', is_required: true },
      { name: 'React', is_required: true },
      { name: 'Docker', is_required: false },
    ]);
    expect(payload.salary_currency).toBeNull();
    expect(payload.salary_visible).toBe(false);
    expect(payload.location).toBeNull();
  });
});
