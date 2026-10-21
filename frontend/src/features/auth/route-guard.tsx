import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '../../components/loading-screen';
import { useAuth } from './auth-context';
import type { ReactNode } from 'react';

/** Content rendered after the applicable authentication guard resolves. */
interface GuardProps { readonly children: ReactNode }

function GuardRedirect({ to }: { readonly to: string }) {
  return <><LoadingScreen message="Đang chuyển hướng…" /><Navigate to={to} replace /></>;
}

/** Requires both a valid access session and an active resolved identity. */
export function AuthGuard({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Đang xác minh phiên đăng nhập…" />;
  if (!isAuthenticated) return <GuardRedirect to="/login" />;
  return <>{children}</>;
}

/** Prevents authenticated users from returning to credential forms. */
export function GuestGuard({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Đang xác minh phiên đăng nhập…" />;
  if (isAuthenticated) return <GuardRedirect to="/workspaces" />;
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
