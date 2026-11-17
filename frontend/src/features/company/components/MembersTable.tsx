import { App, Button, Input, Popconfirm, Select, Table } from 'antd';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { UserAvatar } from '@/components/UserAvatar';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState } from 'react';
import { ErrorState } from '@/components/ErrorState';
import { toApiError } from '@/services/apiError';
import { useMembers, useSetMemberActive, useUpdateMemberRole } from '../queries';
import {
  COMPANY_ROLE_OPTIONS,
  type CompanyRole,
  type Member,
  type MembershipStatus,
} from '../types';

dayjs.extend(relativeTime);

interface MembersTableProps {
  currentUserId: number;
}

export function MembersTable({ currentUserId }: MembersTableProps) {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MembershipStatus | undefined>();

  const members = useMembers({ page, per_page: perPage, search: search || undefined, status });
  const updateRole = useUpdateMemberRole();
  const setActive = useSetMemberActive();

  const onError = (error: unknown) => void message.error(toApiError(error).message);

  const columns: TableProps<Member>['columns'] = [
    {
      title: 'Member',
      key: 'member',
      render: (_, member) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={member.user.name} size="md" />
          <div className="min-w-0 leading-tight">
            <span className="text-sm font-semibold text-slate-900">{member.user.name}</span>
            {member.user.id === currentUserId ? (
              <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                You
              </span>
            ) : null}
            <div className="mt-0.5 text-[13px] text-slate-500">{member.user.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      key: 'role',
      width: 200,
      render: (_, member) =>
        member.user.id === currentUserId || member.status !== 'active' ? (
          <span>{member.role_label ?? 'No role'}</span>
        ) : (
          <Select<CompanyRole>
            aria-label={`Role for ${member.user.name}`}
            className="w-full"
            value={member.role ?? undefined}
            options={COMPANY_ROLE_OPTIONS}
            loading={updateRole.isPending && updateRole.variables.id === member.id}
            onChange={(role) =>
              updateRole.mutate(
                { id: member.id, role },
                { onSuccess: () => void message.success('Role updated.'), onError },
              )
            }
          />
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 130,
      render: (value: MembershipStatus) =>
        value === 'active' ? (
          <StatusBadge label="Active" tone="success" />
        ) : (
          <StatusBadge label="Deactivated" tone="muted" />
        ),
    },
    {
      title: 'Last sign-in',
      key: 'last_login_at',
      width: 160,
      render: (_, member) =>
        member.user.last_login_at ? (
          dayjs(member.user.last_login_at).fromNow()
        ) : (
          <span className="text-slate-400">Never</span>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 140,
      align: 'right',
      render: (_, member) => {
        if (member.user.id === currentUserId) return null;
        return member.status === 'active' ? (
          <Popconfirm
            title={`Deactivate ${member.user.name}?`}
            description="They will lose access to this company immediately."
            okText="Deactivate"
            okButtonProps={{ danger: true }}
            onConfirm={() =>
              setActive.mutate(
                { id: member.id, active: false },
                { onSuccess: () => void message.success('Member deactivated.'), onError },
              )
            }
          >
            <Button danger size="small">
              Deactivate
            </Button>
          </Popconfirm>
        ) : (
          <Button
            size="small"
            onClick={() =>
              setActive.mutate(
                { id: member.id, active: true },
                { onSuccess: () => void message.success('Member reactivated.'), onError },
              )
            }
          >
            Reactivate
          </Button>
        );
      },
    },
  ];

  if (members.isError) {
    return <ErrorState error={members.error} onRetry={() => void members.refetch()} />;
  }

  return (
    <>
      <div className="hf-toolbar">
        <Input.Search
          allowClear
          placeholder="Search by name or email"
          aria-label="Search members"
          onSearch={(value) => {
            setSearch(value.trim());
            setPage(1);
          }}
          style={{ width: 280 }}
        />
        <Select<MembershipStatus>
          allowClear
          placeholder="All statuses"
          aria-label="Filter by status"
          style={{ width: 180 }}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'deactivated', label: 'Deactivated' },
          ]}
        />
      </div>
      <Table<Member>
        rowKey="id"
        columns={columns}
        dataSource={members.data?.data ?? []}
        loading={members.isFetching}
        scroll={{ x: 760 }}
        locale={{
          emptyText: (
            <EmptyState
              compact
              title={search || status ? 'No members match your filters' : 'No members yet'}
            />
          ),
        }}
        pagination={{
          current: page,
          pageSize: perPage,
          total: members.data?.meta.total ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextSize !== perPage ? 1 : nextPage);
            setPerPage(nextSize);
          },
        }}
      />
    </>
  );
}
