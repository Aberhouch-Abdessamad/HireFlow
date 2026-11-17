import { Navigate, Outlet } from 'react-router';
import { FullPageLoader } from '@/components/LoadingSkeleton';
import { useCurrentUser } from '@/features/auth/queries';

/** Pages for signed-out users only (login, register, ...). Signed-in users go to the app. */
export function GuestRoute() {
  const { data: user, isPending } = useCurrentUser();

  if (isPending) return <FullPageLoader />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
