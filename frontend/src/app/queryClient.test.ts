import { describe, expect, it } from 'vitest';
import { ApiError } from '@/services/apiError';
import { shouldRetry } from './queryClient';

const err = (status: number) => new ApiError({ status, code: 'X', message: 'x' });

describe('shouldRetry', () => {
  it('retries network and server errors up to the limit', () => {
    expect(shouldRetry(0, err(0))).toBe(true);
    expect(shouldRetry(1, err(503))).toBe(true);
    expect(shouldRetry(2, err(503))).toBe(false);
  });

  it('never retries client errors', () => {
    for (const status of [401, 403, 404, 419, 422, 429]) {
      expect(shouldRetry(0, err(status))).toBe(false);
    }
  });
});
