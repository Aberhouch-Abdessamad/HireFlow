import type { Permission } from '@/types/permissions';
import type { AuthUser } from './types';

/** Pure permission check used by hooks and components. UI-only; the API is authoritative. */
export function userCan(user: AuthUser | null | undefined, permission: Permission): boolean {
  if (!user) {
    return false;
  }
  if (user.is_super_admin) {
    return true;
  }
  return user.permissions.includes(permission);
}

export function userCanAny(
  user: AuthUser | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => userCan(user, permission));
}
