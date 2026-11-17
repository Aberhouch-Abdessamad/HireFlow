import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toApiError, type ApiError } from '@/services/apiError';

/**
 * Copies Laravel 422 field errors onto a React Hook Form.
 * Returns the ApiError so callers can show a general message when nothing was mapped.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): { apiError: ApiError; mapped: boolean } {
  const apiError = toApiError(error);
  let mapped = false;

  for (const field of fields) {
    const messages = apiError.fieldErrors[field];
    if (messages && messages.length > 0) {
      setError(field, { type: 'server', message: messages[0] });
      mapped = true;
    }
  }

  return { apiError, mapped };
}

/** Accepts only same-app relative paths, so redirects can't send users to another site. */
export function safeRedirectPath(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}
