import { Button, Result } from 'antd';
import type { ResultProps } from 'antd';
import { toApiError } from '@/services/apiError';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

function statusFor(httpStatus: number): ResultProps['status'] {
  if (httpStatus === 403) return '403';
  if (httpStatus === 404) return '404';
  if (httpStatus >= 500) return '500';
  return 'error';
}

/** Standard error display for failed queries. Messages come from ApiError, never raw server output. */
export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const apiError = toApiError(error);
  const defaultTitle =
    apiError.status === 403
      ? 'Access denied'
      : apiError.status === 404
        ? 'Not found'
        : 'Something went wrong';

  return (
    <Result
      status={statusFor(apiError.status)}
      title={title ?? defaultTitle}
      subTitle={apiError.message}
      extra={
        onRetry && !apiError.isForbidden && !apiError.isNotFound ? (
          <Button type="primary" onClick={onRetry}>
            Try again
          </Button>
        ) : null
      }
    />
  );
}
