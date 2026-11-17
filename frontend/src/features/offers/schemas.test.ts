import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { offerFormSchema } from './schemas';

const valid = {
  salary_amount: 65000,
  currency: 'eur',
  contract_type: 'full_time' as const,
  start_date: dayjs().add(30, 'day'),
  expires_at: dayjs().add(7, 'day'),
  message: '',
  internal_notes: '',
};

describe('offer form schema', () => {
  it('accepts a valid offer and normalises the currency', () => {
    const result = offerFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.currency).toBe('EUR');
  });

  it('requires the response deadline to be before the start date', () => {
    const result = offerFormSchema.safeParse({ ...valid, expires_at: dayjs().add(40, 'day') });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['expires_at']);
  });
});
