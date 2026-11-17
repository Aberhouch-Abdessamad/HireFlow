import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, toApiError } from './apiError';

function axiosErrorWith(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response: AxiosResponse = { status, statusText: '', data, headers: {}, config };
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response);
}

describe('toApiError', () => {
  it('maps Laravel validation errors to field errors', () => {
    const error = toApiError(
      axiosErrorWith(422, {
        message: 'The email field is required.',
        code: 'VALIDATION_FAILED',
        errors: { email: ['The email field is required.'] },
      }),
    );

    expect(error.isValidation).toBe(true);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.fieldErrors.email).toEqual(['The email field is required.']);
  });

  it('keeps domain error codes from the API', () => {
    const error = toApiError(
      axiosErrorWith(409, { message: 'Already applied.', code: 'DUPLICATE_APPLICATION' }),
    );
    expect(error.status).toBe(409);
    expect(error.code).toBe('DUPLICATE_APPLICATION');
  });

  it('never exposes server error details for 5xx responses', () => {
    const error = toApiError(axiosErrorWith(500, { message: 'SQLSTATE[42S02]: table missing' }));
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.message).not.toContain('SQLSTATE');
  });

  it('treats a missing response as a network error', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(error.isNetwork).toBe(true);
    expect(error.code).toBe('NETWORK_ERROR');
  });

  it('falls back to default messages when the body is not an API error', () => {
    const error = toApiError(axiosErrorWith(403, '<html>Forbidden</html>'));
    expect(error.isForbidden).toBe(true);
    expect(error.message).toBe('You do not have permission to perform this action.');
  });

  it('returns ApiError instances unchanged', () => {
    const original = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Missing' });
    expect(toApiError(original)).toBe(original);
  });
});
