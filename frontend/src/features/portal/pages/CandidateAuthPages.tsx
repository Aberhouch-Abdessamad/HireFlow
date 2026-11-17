import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form } from 'antd';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { FormInput } from '@/components/form/FormInput';
import { AuthHeading } from '@/features/auth/components/AuthHeading';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { useRefreshSession } from '@/features/auth/queries';
import { passwordSchema } from '@/features/auth/schemas';
import { applyApiErrors } from '@/utils/forms';
import { registerCandidate } from '../api';

export function CandidateLoginPage() {
  return <LoginPage audience="candidate" />;
}

const schema = z
  .object({
    name: z.string().trim().min(1, 'Your name is required.').max(120),
    email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
    password: passwordSchema,
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, {
    path: ['password_confirmation'],
    message: 'Passwords do not match.',
  });

type Values = z.infer<typeof schema>;

export function CandidateRegisterPage() {
  const navigate = useNavigate();
  const refresh = useRefreshSession();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', password_confirmation: '' },
  });

  const onSubmit = async (values: Values) => {
    setFormError(null);
    try {
      await registerCandidate(values);
      await refresh();
      await navigate('/candidate/dashboard', { replace: true });
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, [
        'name',
        'email',
        'password',
        'password_confirmation',
      ]);
      if (!mapped) setFormError(apiError.message);
    }
  };

  return (
    <>
      <AuthHeading
        title="Create your candidate account"
        subtitle="Use the email address you applied with to see all your applications."
      />
      {formError ? <Alert type="error" title={formError} showIcon className="mb-4" /> : null}
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <Form layout="vertical" component={false}>
          <FormInput
            control={control}
            name="name"
            label="Full name"
            autoComplete="name"
            autoFocus
            required
          />
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
        Already have an account? <Link to="/candidate/login">Sign in</Link>
      </p>
    </>
  );
}
