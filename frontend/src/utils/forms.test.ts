import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/apiError';
import { applyApiErrors, safeRedirectPath } from './forms';

describe('applyApiErrors', () => {
  it('maps known fields and reports that it did', () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Invalid',
      fieldErrors: { email: ['Taken.'], other: ['x'] },
    });

    const { mapped } = applyApiErrors<{ email: string; name: string }>(error, setError, [
      'email',
      'name',
    ]);

    expect(mapped).toBe(true);
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Taken.' });
  });
});

describe('safeRedirectPath', () => {
  it('allows internal paths only', () => {
    expect(safeRedirectPath('/company/members?tab=1')).toBe('/company/members?tab=1');
    expect(safeRedirectPath('//evil.example')).toBe('/');
    expect(safeRedirectPath('https://evil.example')).toBe('/');
    expect(safeRedirectPath('/\\evil.example')).toBe('/');
    expect(safeRedirectPath(null, '/profile')).toBe('/profile');
  });
});
