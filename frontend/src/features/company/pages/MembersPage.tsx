import { UserAddOutlined } from '@ant-design/icons';
import { Button, Tabs } from 'antd';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { usePermissions } from '@/hooks/usePermission';
import { InvitationsTable } from '../components/InvitationsTable';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { MembersTable } from '../components/MembersTable';

export function MembersPage() {
  const { user } = usePermissions();
  const [inviteOpen, setInviteOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <PageHeader
        eyebrow="Company"
        title="Team members"
        description="Manage who can access your company's recruitment workspace."
        actions={
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setInviteOpen(true)}>
            Invite member
          </Button>
        }
      />
      <div className="hf-surface overflow-hidden">
        <Tabs
          className="hf-tabs"
          items={[
            {
              key: 'members',
              label: 'Members',
              children: <MembersTable currentUserId={user.id} />,
            },
            {
              key: 'invitations',
              label: 'Pending invitations',
              children: <InvitationsTable onInvite={() => setInviteOpen(true)} />,
            },
          ]}
        />
      </div>
      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
