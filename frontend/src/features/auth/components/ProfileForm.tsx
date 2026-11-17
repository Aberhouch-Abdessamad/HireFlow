import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Card, Form, Input } from 'antd';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { FormInput } from '@/components/form/FormInput';
import { applyApiErrors } from '@/utils/forms';
import { updateProfile } from '../api';
import { authKeys } from '../queries';
import { profileSchema, type ProfileValues } from '../schemas';
import type { AuthUser } from '../types';

export function ProfileForm({ user }: { user: AuthUser }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name },
  });

  const onSubmit = async (values: ProfileValues) => {
    try {
      const updated = await updateProfile(values);
      queryClient.setQueryData(authKeys.me(), updated);
      reset({ name: updated.name });
      void message.success('Profile updated.');
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, ['name']);
      if (!mapped) void message.error(apiError.message);
    }
  };

  return (
    <Card title="Profile">
      <form
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        noValidate
        className="max-w-md"
      >
        <Form layout="vertical" component={false}>
          <FormInput control={control} name="name" label="Full name" autoComplete="name" required />
          <Form.Item
            label="Email"
            htmlFor="profile-email"
            extra="Contact your administrator to change your email address."
          >
            <Input id="profile-email" value={user.email} disabled />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting} disabled={!isDirty}>
            Save
          </Button>
        </Form>
      </form>
    </Card>
  );
}
