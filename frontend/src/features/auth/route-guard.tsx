/**
 * Route guards based on authentication state (UI Spec §2).
 * AuthGuard: redirects to /login if not authenticated.
 * GuestGuard: redirects to /workspaces if already authenticated.
 */

import { Navigate } from 'react-router-dom';

import type { ReactNode } from 'react';

import { useAuth } from './auth-context';

interface GuardProps {
  readonly children: ReactNode;
}

/**
 * Wraps authenticated-only routes. Redirects to /login if no token.
 */
export function AuthGuard({ children }: GuardProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Wraps guest-only routes (login, register). Redirects to /workspaces if authenticated.
 */
export function GuestGuard({ children }: GuardProps) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/workspaces" replace />;
  }

  return <>{children}</>;
}
