import { Navigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import type { ReactNode } from 'react';
interface GuardProps { readonly children: ReactNode }

/** Holds navigation while refresh and authoritative /me are pending. */
function SessionLoading() {
  return <div role="status" aria-live="polite">Đang xác minh phiên đăng nhập…</div>;
}

/** Requires both a valid access session and an active resolved identity. */
export function AuthGuard({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <SessionLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Prevents authenticated users from returning to credential forms. */
export function GuestGuard({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <SessionLoading />;
  if (isAuthenticated) return <Navigate to="/workspaces" replace />;
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
