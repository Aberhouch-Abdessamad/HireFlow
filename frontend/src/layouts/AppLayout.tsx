import { MenuOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Drawer, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { usePermissions } from '@/hooks/usePermission';
import { NotificationsBell } from '@/features/dashboard';
import { Brand } from './Brand';
import { CompanySwitcher } from './CompanySwitcher';
import { UserMenu } from './UserMenu';
import { NAV_ITEMS, activeNavKey, filterNavItems, type NavItem } from './navigation';

/** Short labels for the top bar (the full labels stay in the mobile drawer and settings menu). */
const TOP_LABELS: Partial<Record<string, string>> = {
  dashboard: 'Home',
};

/**
 * Authenticated application shell: a slim top navigation bar (main sections as tabs,
 * company settings in a gear menu) above a wide, centred content area.
 */
export function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { can, user } = usePermissions();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = useMemo(() => filterNavItems(NAV_ITEMS, can), [can]);
  const activeKey = activeNavKey(items, pathname);
  const main = items.filter((item) => item.group !== 'company');
  const settings = items.filter((item) => item.group === 'company');
  const settingsActive = settings.some((item) => item.key === activeKey);

  const settingsMenu: MenuProps = {
    selectedKeys: activeKey ? [activeKey] : [],
    items: settings.map((item) => ({ key: item.key, icon: item.icon, label: item.label })),
    onClick: ({ key }) => {
      const target = settings.find((item) => item.key === key);
      if (target) void navigate(target.path);
    },
  };

  const tab = (item: NavItem) => {
    const active = item.key === activeKey;
    return (
      <Link
        key={item.key}
        to={item.path}
        aria-current={active ? 'page' : undefined}
        className={`relative flex h-full items-center px-3 text-sm font-semibold !no-underline transition-colors ${
          active ? '!text-slate-900' : '!text-slate-500 hover:!text-slate-900'
        }`}
      >
        {TOP_LABELS[item.key] ?? item.label}
        {active ? (
          <span
            aria-hidden="true"
            className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-primary"
          />
        ) : null}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-4 md:px-8">
          <Button
            type="text"
            className="!text-slate-600 lg:!hidden"
            icon={<MenuOutlined />}
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          />
          <Link to="/" aria-label="HireFlow home" className="!no-underline">
            <Brand />
          </Link>

          <nav aria-label="Main" className="hidden h-full items-stretch lg:flex">
            {main.map(tab)}
          </nav>

          {user ? (
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <CompanySwitcher user={user} />
              {settings.length > 0 ? (
                <Dropdown menu={settingsMenu} trigger={['click']} placement="bottomRight">
                  <Button
                    type="text"
                    shape="circle"
                    aria-label="Company settings"
                    icon={<SettingOutlined className="text-[17px]" />}
                    className={
                      settingsActive ? '!bg-primary-soft !text-primary' : '!text-slate-500'
                    }
                  />
                </Dropdown>
              ) : null}
              <NotificationsBell />
              <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-border sm:block" />
              <UserMenu user={user} />
            </div>
          ) : null}
        </div>
      </header>

      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={280}
        title={<Brand />}
        styles={{ body: { padding: 12 } }}
      >
        <nav aria-label="Main" className="flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold !no-underline ${
                item.key === activeKey
                  ? 'bg-primary-soft !text-primary'
                  : '!text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </Drawer>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
