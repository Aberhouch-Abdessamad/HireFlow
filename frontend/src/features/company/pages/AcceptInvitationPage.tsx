import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Form, Result, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { FormInput } from '@/components/form/FormInput';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { authKeys, useCurrentUser } from '@/features/auth/queries';
import { acceptInvitationSchema, type AcceptInvitationValues } from '@/features/auth/schemas';
import { toApiError } from '@/services/apiError';
import { applyApiErrors } from '@/utils/forms';
import { acceptInvitation } from '../api';
import { useInvitationPreview } from '../queries';

export function AcceptInvitationPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const preview = useInvitationPreview(token);
  const { data: currentUser, isPending: userPending } = useCurrentUser();
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const form = useForm<AcceptInvitationValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { name: '', password: '', password_confirmation: '' },
  });

  const finish = async () => {
    queryClient.removeQueries();
    await queryClient.invalidateQueries({ queryKey: authKeys.all });
    await navigate('/', { replace: true });
  };

  const acceptAsCurrentUser = async () => {
    setAccepting(true);
    setError(null);
    try {
      await acceptInvitation(token, {});
      await finish();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setAccepting(false);
    }
  };

  const createAccount = async (values: AcceptInvitationValues) => {
    setError(null);
    try {
      await acceptInvitation(token, values);
      await finish();
    } catch (err) {
      const { apiError, mapped } = applyApiErrors(err, form.setError, [
        'name',
        'password',
        'password_confirmation',
      ]);
      if (!mapped) setError(apiError.message);
    }
  };

  if (preview.isPending || userPending) {
    return <LoadingSkeleton rows={4} />;
  }

  if (preview.isError) {
    const apiError = toApiError(preview.error);
    return (
      <Result
        status={apiError.isNotFound ? 'warning' : 'error'}
        title={
          apiError.isNotFound ? 'This invitation is invalid or has expired' : 'Something went wrong'
        }
        subTitle={
          apiError.isNotFound
            ? 'Ask your company administrator to send a new invitation.'
            : apiError.message
        }
        extra={<Link to="/login">Go to sign in</Link>}
      />
    );
  }

  const invitation = preview.data;
  const signedInAsInvitee = currentUser?.email.toLowerCase() === invitation.email.toLowerCase();

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <Typography.Title level={3}>Join {invitation.company.name}</Typography.Title>
        <Typography.Paragraph type="secondary">
          You've been invited as <strong>{invitation.role_label}</strong> ({invitation.email}).
        </Typography.Paragraph>

        {error ? <Alert type="error" title={error} showIcon className="mb-4" /> : null}

        {currentUser && !signedInAsInvitee ? (
          <Alert
            type="warning"
            showIcon
            title={`You're signed in as ${currentUser.email}`}
            description="Sign out and sign in with the invited email address to accept this invitation."
          />
        ) : invitation.account_exists && !currentUser ? (
          <Link to={`/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`}>
            <Button type="primary" block>
              Sign in to accept
            </Button>
          </Link>
        ) : signedInAsInvitee ? (
          <Button
            type="primary"
            block
            loading={accepting}
            onClick={() => void acceptAsCurrentUser()}
          >
            Accept invitation
          </Button>
        ) : (
          <form onSubmit={(event) => void form.handleSubmit(createAccount)(event)} noValidate>
            <Form layout="vertical" component={false}>
              <FormInput
                control={form.control}
                name="name"
                label="Your full name"
                autoComplete="name"
                autoFocus
                required
              />
              <FormInput
                control={form.control}
                name="password"
                label="Password"
                type="password"
                autoComplete="new-password"
                required
              />
              <FormInput
                control={form.control}
                name="password_confirmation"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                required
              />
              <Button type="primary" htmlType="submit" block loading={form.formState.isSubmitting}>
                Create account and join
              </Button>
            </Form>
          </form>
        )}
      </Card>
    </div>
  );
}
