import { useCallback } from 'react';
import { useCurrentUser } from '@/features/auth/queries';
import { userCan } from '@/features/auth/permissions';
import type { Permission } from '@/types/permissions';

/** Returns a stable `can(permission)` function bound to the current user. */
export function usePermissions() {
  const { data: user } = useCurrentUser();
  const can = useCallback((permission: Permission) => userCan(user, permission), [user]);
  return { can, user: user ?? null };
}

export function usePermission(permission: Permission): boolean {
  const { can } = usePermissions();
  return can(permission);
}
