import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Card, Form } from 'antd';
import { useForm } from 'react-hook-form';
import { FormInput } from '@/components/form/FormInput';
import { applyApiErrors } from '@/utils/forms';
import { updatePassword } from '../api';
import { changePasswordSchema, type ChangePasswordValues } from '../schemas';

const EMPTY: ChangePasswordValues = {
  current_password: '',
  password: '',
  password_confirmation: '',
};

export function ChangePasswordForm() {
  const { message } = App.useApp();
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  const onSubmit = async (values: ChangePasswordValues) => {
    try {
      await updatePassword(values);
      reset(EMPTY);
      void message.success('Password changed.');
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, [
        'current_password',
        'password',
        'password_confirmation',
      ]);
      if (!mapped) void message.error(apiError.message);
    }
  };

  return (
    <Card title="Change password">
      <form
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        noValidate
        className="max-w-md"
      >
        <Form layout="vertical" component={false}>
          <FormInput
            control={control}
            name="current_password"
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
          />
          <FormInput
            control={control}
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
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
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Update password
          </Button>
        </Form>
      </form>
    </Card>
  );
}
