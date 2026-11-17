import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Result } from 'antd';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { FormInput } from '@/components/form/FormInput';
import { applyApiErrors } from '@/utils/forms';
import { resetPassword } from '../api';
import { AuthHeading } from '../components/AuthHeading';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: params.get('email') ?? '', password: '', password_confirmation: '' },
  });

  if (!token) {
    return (
      <Result
        status="warning"
        title="Invalid reset link"
        subTitle="This password reset link is incomplete. Request a new one."
        extra={<Link to="/forgot-password">Request a new link</Link>}
      />
    );
  }

  if (done) {
    return (
      <Result
        status="success"
        title="Password updated"
        subTitle="You can now sign in with your new password."
        extra={<Link to="/login">Sign in</Link>}
      />
    );
  }

  const onSubmit = async (values: ResetPasswordValues) => {
    setFormError(null);
    try {
      await resetPassword({ ...values, token });
      setDone(true);
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, ['email', 'password']);
      if (!mapped) setFormError(apiError.message);
    }
  };

  return (
    <>
      <AuthHeading title="Choose a new password" />
      {formError ? <Alert type="error" title={formError} showIcon className="mb-4" /> : null}
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <Form layout="vertical" component={false}>
          <FormInput
            control={control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
          />
          <FormInput
            control={control}
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
          />
          <FormInput
            control={control}
            name="password_confirmation"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
          />
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Reset password
          </Button>
        </Form>
      </form>
    </>
  );
}
