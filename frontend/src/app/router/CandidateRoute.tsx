import { Navigate, Outlet, useLocation } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { FullPageLoader } from '@/components/LoadingSkeleton';
import { useCurrentUser } from '@/features/auth/queries';

/** Candidate portal guard: signed in, candidate account. */
export function CandidateRoute() {
  const location = useLocation();
  const { data: user, isPending, isError, error, refetch } = useCurrentUser();

  if (isPending) return <FullPageLoader />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!user) return <Navigate to="/candidate/login" replace state={{ from: location.pathname }} />;
  if (!user.is_candidate) return <Navigate to="/" replace />;

  return <Outlet />;
}
