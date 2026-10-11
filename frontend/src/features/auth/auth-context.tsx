/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { restoreCookieSession, resolveSessionUser } from '../../lib/cookie-session';
import { getSessionSnapshot, invalidateSession, storeAccessToken, storeSessionUser, subscribeSession } from '../../lib/session-store';
import type { ReactNode } from 'react';
import type { SessionUser } from '../../lib/session-store';

interface AuthState {
  readonly token: string | null;
  readonly user: SessionUser | null;
  readonly isAuthenticated: boolean;
  readonly isLoading?: boolean;
  readonly sessionError?: string | null;
  readonly setToken: (token: string, user?: SessionUser) => void;
  readonly setUser: (user: SessionUser | null) => void;
  readonly clearToken: () => void;
}
const AuthContext = createContext<AuthState | null>(null);
const bootstrap = { pending: null as Promise<void> | null };

/** Gates every protected route on an authoritative active /me identity. */
export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const queryClient = useQueryClient();
  const snapshot = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
  useEffect(() => {
    if (!bootstrap.pending) {
      bootstrap.pending = restoreCookieSession().catch((error: unknown) => {
        if (getSessionSnapshot().status === 'restoring') {
          invalidateSession('recovery', error instanceof Error ? error.message : 'Không thể khôi phục phiên');
        }
      });
    }
  }, []);
  useEffect(() => { queryClient.clear(); }, [snapshot.generation, queryClient]);
  const value: AuthState = {
    token: snapshot.token, user: snapshot.user, isAuthenticated: snapshot.status === 'authenticated',
    isLoading: snapshot.status === 'restoring', sessionError: snapshot.error,
    setToken: acceptToken, setUser: storeSessionUser, clearToken: () => { invalidateSession(); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function acceptToken(token: string, user?: SessionUser): void {
  const generation = getSessionSnapshot().generation;
  storeAccessToken(token, generation);
  if (user) { storeSessionUser(user, generation); return; }
  void resolveSessionUser(generation).catch((error: unknown) => {
    if (getSessionSnapshot().generation === generation) {
      invalidateSession('recovery', error instanceof Error ? error.message : 'Không thể xác minh danh tính');
    }
  });
}

/** Reads the shared memory-only authentication state. */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
