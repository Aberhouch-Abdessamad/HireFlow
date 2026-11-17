import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form } from 'antd';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { FormInput } from '@/components/form/FormInput';
import { applyApiErrors } from '@/utils/forms';
import { register } from '../api';
import { AuthHeading } from '../components/AuthHeading';
import { useRefreshSession } from '../queries';
import { registerSchema, type RegisterValues } from '../schemas';

const FIELDS = ['company_name', 'name', 'email', 'password', 'password_confirmation'] as const;

export function RegisterPage() {
  const navigate = useNavigate();
  const refreshSession = useRefreshSession();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      company_name: '',
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      await register(values);
      await refreshSession();
      await navigate('/', { replace: true });
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, FIELDS);
      if (!mapped) setFormError(apiError.message);
    }
  };

  return (
    <>
      <AuthHeading
        title="Create your company account"
        subtitle="Start hiring with HireFlow in minutes."
      />
      {formError ? <Alert type="error" title={formError} showIcon className="mb-4" /> : null}
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <Form layout="vertical" component={false}>
          <FormInput
            control={control}
            name="company_name"
            label="Company name"
            autoComplete="organization"
            autoFocus
            required
          />
          <FormInput
            control={control}
            name="name"
            label="Your full name"
            autoComplete="name"
            required
          />
          <FormInput
            control={control}
            name="email"
            label="Work email"
            type="email"
            autoComplete="email"
            required
          />
          <FormInput
            control={control}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            extra="At least 10 characters with upper and lowercase letters and a number."
          />
          <FormInput
            control={control}
            name="password_confirmation"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
          />
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Create account
          </Button>
        </Form>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </>
  );
}
