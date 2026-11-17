import { Result } from 'antd';
import type { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import type { Permission } from '@/types/permissions';

interface RequirePermissionProps {
  permission: Permission;
  children: ReactNode;
}

/** Route-level UI guard. The API enforces the same permission on every request it serves. */
export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const allowed = usePermission(permission);

  if (!allowed) {
    return (
      <Result
        status="403"
        title="Access denied"
        subTitle="You do not have permission to view this page."
      />
    );
  }

  return children;
}
