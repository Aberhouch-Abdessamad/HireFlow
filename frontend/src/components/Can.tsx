import type { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import type { Permission } from '@/types/permissions';

interface CanProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Shows children only if the current user has the permission. Visual only, never a security boundary. */
export function Can({ permission, children, fallback = null }: CanProps) {
  return usePermission(permission) ? children : fallback;
}
