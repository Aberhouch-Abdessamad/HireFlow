import { describe, expect, it } from 'vitest';
import { candidateFormSchema, emptyCandidateForm, formToPayload } from './schemas';

const base = {
  ...emptyCandidateForm,
  first_name: 'Lina',
  last_name: 'Haddad',
  email: 'lina@example.test',
};

describe('candidate form schema', () => {
  it('validates URLs and phone numbers', () => {
    const result = candidateFormSchema.safeParse({
      ...base,
      phone: 'call me',
      linkedin_url: 'https://evil.example/in/lina',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(['phone', 'linkedin_url']),
    );
  });

  it('rejects experiences that end before they start', () => {
    const result = candidateFormSchema.safeParse({
      ...base,
      experiences: [
        {
          company_name: 'X',
          title: 'Dev',
          start_date: '2024-05-01',
          end_date: '2023-01-01',
          is_current: false,
          description: '',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('maps empty strings to null and clears end dates of current jobs', () => {
    const payload = formToPayload({
      ...base,
      experiences: [
        {
          company_name: 'X',
          title: 'Dev',
          start_date: '2024-05-01',
          end_date: '2025-01-01',
          is_current: true,
          description: '',
        },
      ],
    });
    expect(payload.phone).toBeNull();
    expect(payload.experiences[0]?.end_date).toBeNull();
    expect(payload.experiences[0]?.description).toBeNull();
  });
});
