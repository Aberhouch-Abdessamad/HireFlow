import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Checkbox, Form } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { FormInput } from '@/components/form/FormInput';
import { applyApiErrors, safeRedirectPath } from '@/utils/forms';
import { login } from '../api';
import { AuthHeading } from '../components/AuthHeading';
import { useRefreshSession } from '../queries';
import { loginSchema, type LoginValues } from '../schemas';

interface LoginPageProps {
  /** Staff (company users) or candidate-portal sign-in. Both use the same API endpoint. */
  audience?: 'staff' | 'candidate';
}

export function LoginPage({ audience = 'staff' }: LoginPageProps) {
  const isCandidate = audience === 'candidate';
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const refreshSession = useRefreshSession();
  const [formError, setFormError] = useState<string | null>(null);

  const fromState = (location.state as { from?: string } | null)?.from;
  const redirectTo = safeRedirectPath(
    params.get('redirect') ?? fromState,
    isCandidate ? '/candidate/dashboard' : '/',
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const result = await login(values);
      if (result.twoFactor) {
        await navigate('/two-factor-challenge', { state: { from: redirectTo } });
        return;
      }
      await refreshSession();
      await navigate(redirectTo, { replace: true });
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, ['email', 'password']);
      if (!mapped) setFormError(apiError.message);
    }
  };

  return (
    <>
      <AuthHeading
        title={isCandidate ? 'Candidate sign in' : 'Sign in'}
        subtitle={
          isCandidate
            ? 'Track your applications, interviews and offers.'
            : 'Welcome back to HireFlow.'
        }
      />
      {formError ? <Alert type="error" title={formError} showIcon className="mb-4" /> : null}
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <Form layout="vertical" component={false}>
          <FormInput
            control={control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            required
          />
          <FormInput
            control={control}
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
          />
          <div className="mb-4 flex items-center justify-between">
            <Controller
              control={control}
              name="remember"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                >
                  Remember me
                </Checkbox>
              )}
            />
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Sign in
          </Button>
        </Form>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        {isCandidate ? (
          <>
            New here? <Link to="/candidate/register">Create a candidate account</Link>
          </>
        ) : (
          <>
            New to HireFlow? <Link to="/register">Create a company account</Link>
            <br />
            Applied for a job? <Link to="/candidate/login">Candidate sign in</Link>
          </>
        )}
      </p>
    </>
  );
}
