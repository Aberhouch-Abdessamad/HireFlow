import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Card, Form, Input, Tag, Typography } from 'antd';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ErrorState } from '@/components/ErrorState';
import { FormInput } from '@/components/form/FormInput';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm';
import { applyApiErrors } from '@/utils/forms';
import { useMyProfile, useUpdateMyProfile } from '../queries';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === '' || /^[0-9+().\-\s]{6,40}$/.test(v), 'Enter a valid phone number.'),
  location: z.string().trim().max(150),
  linkedin_url: z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === '' || /^https:\/\/.+/i.test(v), 'Enter a full https:// URL.'),
  portfolio_url: z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === '' || /^https?:\/\/.+/i.test(v), 'Enter a full URL.'),
});
type Values = z.infer<typeof schema>;

const orNull = (v: string) => (v === '' ? null : v);

export function CandidateProfilePage() {
  const { message } = App.useApp();
  const profile = useMyProfile();
  const update = useUpdateMyProfile();
  const { control, handleSubmit, reset, setError } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (profile.data) {
      reset({
        name: profile.data.name,
        phone: profile.data.phone ?? '',
        location: profile.data.location ?? '',
        linkedin_url: profile.data.linkedin_url ?? '',
        portfolio_url: profile.data.portfolio_url ?? '',
      });
    }
  }, [profile.data, reset]);

  if (profile.isPending) return <LoadingSkeleton rows={6} />;
  if (profile.isError)
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;

  const onSubmit = async (values: Values) => {
    try {
      await update.mutateAsync({
        name: values.name,
        phone: orNull(values.phone),
        location: orNull(values.location),
        linkedin_url: orNull(values.linkedin_url),
        portfolio_url: orNull(values.portfolio_url),
      });
      void message.success('Profile updated.');
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, [
        'name',
        'phone',
        'location',
        'linkedin_url',
        'portfolio_url',
      ]);
      if (!mapped) void message.error(apiError.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title="Profile">
        <Typography.Paragraph type="secondary">
          Your contact details are shared with:{' '}
          {profile.data.linked_companies.length > 0
            ? profile.data.linked_companies.map((c) => <Tag key={c}>{c}</Tag>)
            : 'no company yet'}
        </Typography.Paragraph>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="max-w-xl">
          <Form layout="vertical" component={false}>
            <FormInput control={control} name="name" label="Full name" required />
            <Form.Item label="Email" htmlFor="portal-email">
              <Input id="portal-email" value={profile.data.email} disabled />
            </Form.Item>
            <FormInput control={control} name="phone" label="Phone" />
            <FormInput control={control} name="location" label="Location" />
            <FormInput control={control} name="linkedin_url" label="LinkedIn" type="url" />
            <FormInput control={control} name="portfolio_url" label="Portfolio" type="url" />
            <Button type="primary" htmlType="submit" loading={update.isPending}>
              Save
            </Button>
          </Form>
        </form>
      </Card>
      <ChangePasswordForm />
    </div>
  );
}
