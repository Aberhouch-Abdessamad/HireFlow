import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form } from 'antd';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { FormInput } from '@/components/form/FormInput';
import { toApiError } from '@/services/apiError';
import { safeRedirectPath } from '@/utils/forms';
import { twoFactorChallenge } from '../api';
import { AuthHeading } from '../components/AuthHeading';
import { useRefreshSession } from '../queries';
import { twoFactorSchema, type TwoFactorValues } from '../schemas';

export function TwoFactorChallengePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshSession = useRefreshSession();
  const [useRecovery, setUseRecovery] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const redirectTo = safeRedirectPath((location.state as { from?: string } | null)?.from);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TwoFactorValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { code: '', recovery_code: '' },
  });

  const onSubmit = async (values: TwoFactorValues) => {
    setFormError(null);
    const value = useRecovery ? values.recovery_code : values.code;
    if (!value) {
      setFormError(useRecovery ? 'Enter a recovery code.' : 'Enter the 6-digit code.');
      return;
    }
    try {
      await twoFactorChallenge(useRecovery ? { recovery_code: value } : { code: value });
      await refreshSession();
      await navigate(redirectTo, { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      setFormError(apiError.isValidation ? 'The code is invalid. Try again.' : apiError.message);
    }
  };

  return (
    <>
      <AuthHeading
        title="Two-factor authentication"
        subtitle={
          useRecovery
            ? 'Enter one of your emergency recovery codes.'
            : 'Enter the 6-digit code from your authenticator app.'
        }
      />
      {formError ? <Alert type="error" title={formError} showIcon className="mb-4" /> : null}
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <Form layout="vertical" component={false}>
          {useRecovery ? (
            <FormInput
              control={control}
              name="recovery_code"
              label="Recovery code"
              autoComplete="one-time-code"
              autoFocus
            />
          ) : (
            <FormInput
              control={control}
              name="code"
              label="Authentication code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
            />
          )}
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Verify
          </Button>
        </Form>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <Button type="link" className="p-0" onClick={() => setUseRecovery((value) => !value)}>
          {useRecovery ? 'Use an authentication code' : 'Use a recovery code'}
        </Button>
        <Link to="/login">Back to sign in</Link>
      </div>
    </>
  );
}
