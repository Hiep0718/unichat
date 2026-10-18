import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from './auth-context';
import { loginPathFor, RETURN_PARAM, safeReturnTo } from './return-to';
import type { ReactNode } from 'react';
interface GuardProps { readonly children: ReactNode }

/** Holds navigation while refresh and authoritative /me are pending. */
function SessionLoading() {
  return <div role="status" aria-live="polite">Đang xác minh phiên đăng nhập…</div>;
}

/** Requires both a valid access session and an active resolved identity. */
export function AuthGuard({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <SessionLoading />;
  if (!isAuthenticated) {
    // Carries where they were going, so signing in resumes it rather than
    // dropping them on the default page with the click forgotten.
    const destination = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={loginPathFor(destination)} replace />;
  }
  return <>{children}</>;
}

/** Prevents authenticated users from returning to credential forms. */
export function GuestGuard({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  if (isLoading) return <SessionLoading />;
  if (isAuthenticated) {
    // Someone already signed in who opens an invite link reaches the login
    // route; send them on to it rather than to the default page.
    return <Navigate to={safeReturnTo(searchParams.get(RETURN_PARAM))} replace />;
  }
  return <>{children}</>;
}

/** Uses only the authoritative system role; names never grant permissions. */
export function AdminGuard({ children }: GuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <SessionLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.systemRole !== 'ADMIN' || user.status !== 'ACTIVE') return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}
