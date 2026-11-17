import { describe, expect, it } from 'vitest';
import type { NavItem } from './navigation';
import { NAV_ITEMS, activeNavKey, filterNavItems } from './navigation';

const items: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: null },
  {
    key: 'analytics',
    label: 'Analytics',
    path: '/dashboard/analytics',
    icon: null,
    permission: 'analytics.view',
  },
  { key: 'jobs', label: 'Jobs', path: '/jobs', icon: null, permission: 'jobs.view' },
];

describe('navigation', () => {
  it('hides items the user lacks permission for', () => {
    expect(filterNavItems(items, (p) => p === 'jobs.view').map((i) => i.key)).toEqual([
      'dashboard',
      'jobs',
    ]);
    expect(filterNavItems(NAV_ITEMS, () => false)).toEqual([]);
  });

  it('selects the most specific matching item', () => {
    expect(activeNavKey(items, '/dashboard/analytics')).toBe('analytics');
    expect(activeNavKey(items, '/dashboard')).toBe('dashboard');
    expect(activeNavKey(items, '/jobs/42/edit')).toBe('jobs');
    expect(activeNavKey(items, '/jobsearch')).toBeUndefined();
  });
});
