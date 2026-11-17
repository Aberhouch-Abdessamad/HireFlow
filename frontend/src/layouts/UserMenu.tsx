import { DownOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router';
import { UserAvatar } from '@/components/UserAvatar';
import { useLogout } from '@/features/auth/queries';
import type { AuthUser } from '@/features/auth/types';

export function UserMenu({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const logout = useLogout();

  const items: MenuProps['items'] = [
    {
      key: 'header',
      type: 'group',
      label: (
        <div className="py-1">
          <div className="text-sm font-semibold text-slate-900 normal-case">{user.name}</div>
          <div className="text-xs font-normal text-slate-500 normal-case">{user.email}</div>
        </div>
      ),
    },
    { type: 'divider' },
    { key: 'profile', icon: <UserOutlined />, label: 'My profile' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
  ];

  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') void navigate('/profile');
    if (key === 'logout') {
      logout.mutate(undefined, { onSettled: () => void navigate('/login', { replace: true }) });
    }
  };

  return (
    <Dropdown
      menu={{ items, onClick }}
      trigger={['click']}
      placement="bottomRight"
      overlayStyle={{ minWidth: 220 }}
    >
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent py-1 pr-1.5 pl-1 transition-colors hover:bg-slate-100"
        aria-label="Account menu"
      >
        <UserAvatar name={user.name} size="sm" />
        <div className="hidden text-left leading-tight sm:block">
          <div className="max-w-[160px] truncate text-[13px] font-semibold text-slate-900">
            {user.name}
          </div>
          <div className="max-w-[160px] truncate text-xs text-slate-500">
            {user.current_company?.name ?? 'No company selected'}
          </div>
        </div>
        <DownOutlined className="hidden text-[10px] text-slate-400 sm:inline" />
      </button>
    </Dropdown>
  );
}
