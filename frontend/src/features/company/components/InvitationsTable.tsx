import { App, Button, Popconfirm, Table } from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { toApiError } from '@/services/apiError';
import { useInvitations, useRevokeInvitation } from '../queries';
import type { Invitation } from '../types';

export function InvitationsTable({ onInvite }: { onInvite: () => void }) {
  const { message } = App.useApp();
  const invitations = useInvitations();
  const revoke = useRevokeInvitation();

  if (invitations.isError) {
    return <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />;
  }

  if (invitations.isSuccess && invitations.data.length === 0) {
    return (
      <EmptyState
        title="No pending invitations"
        description="Invite recruiters, HR managers and interviewers to collaborate."
        action={
          <Button type="primary" onClick={onInvite}>
            Invite a member
          </Button>
        }
      />
    );
  }

  const columns: TableProps<Invitation>['columns'] = [
    { title: 'Email', dataIndex: 'email' },
    { title: 'Role', dataIndex: 'role_label', width: 180 },
    {
      title: 'Invited by',
      dataIndex: 'invited_by',
      width: 180,
      render: (value: string | null | undefined) => value ?? 'Unknown',
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      width: 160,
      render: (value: string) => dayjs(value).format('MMM D, YYYY'),
    },
    {
      title: '',
      key: 'actions',
      width: 110,
      align: 'right',
      render: (_, invitation) => (
        <Popconfirm
          title="Revoke this invitation?"
          okText="Revoke"
          okButtonProps={{ danger: true }}
          onConfirm={() =>
            revoke.mutate(invitation.id, {
              onSuccess: () => void message.success('Invitation revoked.'),
              onError: (error) => void message.error(toApiError(error).message),
            })
          }
        >
          <Button size="small" danger>
            Revoke
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Table<Invitation>
      rowKey="id"
      columns={columns}
      dataSource={invitations.data ?? []}
      loading={invitations.isPending}
      pagination={false}
      scroll={{ x: 700 }}
    />
  );
}
