import { Button, Result } from 'antd';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { FullPageLoader } from '@/components/LoadingSkeleton';
import { useCurrentUser, useLogout } from '@/features/auth/queries';

function NoCompanyNotice() {
  const logout = useLogout();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Result
        status="403"
        title="No active company"
        subTitle="Your account isn't an active member of any company. Ask an administrator to invite you."
        extra={
          <Button
            onClick={() => logout.mutate(undefined, { onSettled: () => void navigate('/login') })}
          >
            Sign out
          </Button>
        }
      />
    </div>
  );
}

/**
 * Requires a signed-in user with an active company.
 * Unauthenticated users go to /login with a return path.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const { data: user, isPending, isError, error, refetch } = useCurrentUser();

  if (isPending) {
    return <FullPageLoader />;
  }

  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (user.is_candidate) {
    return <Navigate to="/candidate/dashboard" replace />;
  }

  if (!user.current_company) {
    return <NoCompanyNotice />;
  }

  return <Outlet />;
}
