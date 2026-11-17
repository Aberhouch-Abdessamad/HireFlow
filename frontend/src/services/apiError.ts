import { isAxiosError } from 'axios';
import type { ApiErrorBody } from '@/types/api';

/** Normalised error for anything that goes wrong while calling the API. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(params: {
    message: string;
    status: number;
    code: string;
    fieldErrors?: Record<string, string[]>;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors ?? {};
  }

  get isValidation(): boolean {
    return this.status === 422;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get needsPasswordConfirmation(): boolean {
    return this.status === 423;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'Unable to reach the server. Check your connection and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with the current state. Refresh and try again.',
  419: 'Your session has expired. Please refresh the page.',
  422: 'Some fields are invalid.',
  423: 'Please confirm your password to continue.',
  429: 'Too many requests. Please wait a moment and try again.',
};

const DEFAULT_CODES: Record<number, string> = {
  0: 'NETWORK_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  419: 'CSRF_TOKEN_MISMATCH',
  422: 'VALIDATION_FAILED',
  423: 'PASSWORD_CONFIRMATION_REQUIRED',
  429: 'TOO_MANY_REQUESTS',
};

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

/** Turns any thrown value into an ApiError. Server details are never exposed for 5xx responses. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const body: unknown = error.response?.data;

    if (status >= 500) {
      return new ApiError({
        status,
        code: 'SERVER_ERROR',
        message: 'Something went wrong on our side. Please try again later.',
      });
    }

    if (isApiErrorBody(body)) {
      return new ApiError({
        status,
        code: body.code ?? DEFAULT_CODES[status] ?? 'REQUEST_FAILED',
        message: body.message || DEFAULT_MESSAGES[status] || 'Request failed.',
        fieldErrors: body.errors ?? {},
      });
    }

    return new ApiError({
      status,
      code: DEFAULT_CODES[status] ?? 'REQUEST_FAILED',
      message: DEFAULT_MESSAGES[status] ?? 'Request failed.',
    });
  }

  return new ApiError({
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
  });
}
