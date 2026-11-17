import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Result } from 'antd';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { FormInput } from '@/components/form/FormInput';
import { applyApiErrors } from '@/utils/forms';
import { forgotPassword } from '../api';
import { AuthHeading } from '../components/AuthHeading';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';

export function ForgotPasswordPage() {
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: ForgotPasswordValues) => {
    setFormError(null);
    try {
      setSentMessage(await forgotPassword(email));
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, ['email']);
      if (!mapped) setFormError(apiError.message);
    }
  };

  if (sentMessage) {
    return (
      <Result
        status="success"
        title="Check your inbox"
        subTitle={sentMessage}
        extra={<Link to="/login">Back to sign in</Link>}
      />
    );
  }

  return (
    <>
      <AuthHeading title="Forgot your password?" subtitle="We'll email you a link to reset it." />
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
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Send reset link
          </Button>
        </Form>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login">Back to sign in</Link>
      </p>
    </>
  );
}
