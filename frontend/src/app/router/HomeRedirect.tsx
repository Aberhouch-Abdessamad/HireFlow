import { Navigate } from 'react-router';
import { usePermissions } from '@/hooks/usePermission';
import { NAV_ITEMS, filterNavItems } from '@/layouts/navigation';

/** Sends users to the first section they can access. */
export function HomeRedirect() {
  const { can } = usePermissions();
  const first = filterNavItems(NAV_ITEMS, can)[0];
  return <Navigate to={first?.path ?? '/profile'} replace />;
}
