import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { LoadingScreen } from '../../components/loading-screen';
import { useAuth } from './auth-context';
import { loginPathFor, RETURN_PARAM, safeReturnTo } from './return-to';
import type { ReactNode } from 'react';

/** Content rendered after the applicable authentication guard resolves. */
interface GuardProps { readonly children: ReactNode }

function GuardRedirect({ to }: { readonly to: string }) {
  return <><LoadingScreen message="Đang chuyển hướng…" /><Navigate to={to} replace /></>;
}

/** Requires both a valid access session and an active resolved identity. */
export function AuthGuard({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingScreen message="Đang xác minh phiên đăng nhập…" />;
  if (!isAuthenticated) {
    // Carries where they were going, so signing in resumes it rather than
    // dropping them on the default page with the click forgotten.
    const destination = `${location.pathname}${location.search}${location.hash}`;
    return <GuardRedirect to={loginPathFor(destination)} />;
  }
  return <>{children}</>;
}

/** Prevents authenticated users from returning to credential forms. */
export function GuestGuard({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  if (isLoading) return <LoadingScreen message="Đang xác minh phiên đăng nhập…" />;
  if (isAuthenticated) {
    // Someone already signed in who opens an invite link reaches the login
    // route; send them on to it rather than to the default page.
    return <GuardRedirect to={safeReturnTo(searchParams.get(RETURN_PARAM))} />;
  }
  return <>{children}</>;
}

/** Uses only the authoritative system role; names never grant permissions. */
export function AdminGuard({ children }: GuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Đang xác minh phiên đăng nhập…" />;
  if (!isAuthenticated) return <GuardRedirect to="/login" />;
  if (user?.systemRole !== 'ADMIN' || user.status !== 'ACTIVE') return <GuardRedirect to="/forbidden" />;
  return <>{children}</>;
}
