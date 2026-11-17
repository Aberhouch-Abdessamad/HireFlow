import {
  ApartmentOutlined,
  BranchesOutlined,
  CalendarOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  LineChartOutlined,
  NodeIndexOutlined,
  ProfileOutlined,
  SettingOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { Permission } from '@/types/permissions';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
  /** When set, the item is only shown to users with this permission. */
  permission?: Permission;
  /** Sidebar section the item is listed under. */
  group?: NavGroup;
}

export type NavGroup = 'overview' | 'recruiting' | 'company';

export const NAV_GROUPS: readonly { key: NavGroup; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'recruiting', label: 'Recruiting' },
  { key: 'company', label: 'Company' },
];

/** Main sidebar navigation. Items are added in the phase that implements their pages. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: 'dashboard',
    group: 'overview',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardOutlined />,
    permission: 'analytics.view',
  },
  {
    key: 'analytics',
    group: 'overview',
    label: 'Analytics',
    path: '/analytics',
    icon: <LineChartOutlined />,
    permission: 'analytics.view',
  },
  {
    key: 'jobs',
    group: 'recruiting',
    label: 'Jobs',
    path: '/jobs',
    icon: <ProfileOutlined />,
    permission: 'jobs.view',
  },
  {
    key: 'pipeline',
    group: 'recruiting',
    label: 'Pipeline',
    path: '/applications/pipeline',
    icon: <NodeIndexOutlined />,
    permission: 'applications.view',
  },
  {
    key: 'applications',
    group: 'recruiting',
    label: 'Applications',
    path: '/applications',
    icon: <SolutionOutlined />,
    permission: 'applications.view',
  },
  {
    key: 'candidates',
    group: 'recruiting',
    label: 'Candidates',
    path: '/candidates',
    icon: <UserOutlined />,
    permission: 'candidates.view',
  },
  {
    key: 'interviews',
    group: 'recruiting',
    label: 'Interviews',
    path: '/interviews',
    icon: <CalendarOutlined />,
    permission: 'interviews.view',
  },
  {
    key: 'offers',
    group: 'recruiting',
    label: 'Offers',
    path: '/offers',
    icon: <FileDoneOutlined />,
    permission: 'offers.view',
  },
  {
    key: 'members',
    group: 'company',
    label: 'Team members',
    path: '/company/members',
    icon: <TeamOutlined />,
    permission: 'users.manage',
  },
  {
    key: 'departments',
    group: 'company',
    label: 'Departments',
    path: '/company/departments',
    icon: <ApartmentOutlined />,
    permission: 'company.settings',
  },
  {
    key: 'pipeline-settings',
    group: 'company',
    label: 'Pipeline stages',
    path: '/company/pipeline',
    icon: <BranchesOutlined />,
    permission: 'company.settings',
  },
  {
    key: 'company',
    group: 'company',
    label: 'Company profile',
    path: '/company/profile',
    icon: <SettingOutlined />,
    permission: 'company.settings',
  },
];

export function filterNavItems(
  items: readonly NavItem[],
  can: (permission: Permission) => boolean,
): NavItem[] {
  return items.filter((item) => !item.permission || can(item.permission));
}

/** Picks the nav item that best matches the current path (longest prefix wins). */
export function activeNavKey(items: readonly NavItem[], pathname: string): string | undefined {
  return [...items]
    .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]?.key;
}
