import { describe, expect, it } from 'vitest';
import { makeUser } from '@/test/fixtures';
import { userCan, userCanAny } from './permissions';

describe('userCan', () => {
  it('denies everything without a user', () => {
    expect(userCan(null, 'jobs.view')).toBe(false);
    expect(userCan(undefined, 'jobs.view')).toBe(false);
  });

  it('checks the user permission list', () => {
    const user = makeUser();
    expect(userCan(user, 'jobs.view')).toBe(true);
    expect(userCan(user, 'jobs.publish')).toBe(false);
  });

  it('lets super admins through', () => {
    expect(userCan(makeUser({ is_super_admin: true, permissions: [] }), 'audit_logs.view')).toBe(
      true,
    );
  });

  it('supports any-of checks', () => {
    const user = makeUser();
    expect(userCanAny(user, ['offers.view', 'jobs.view'])).toBe(true);
    expect(userCanAny(user, ['offers.view', 'users.manage'])).toBe(false);
  });
});
