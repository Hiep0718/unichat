import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { loginSession, logoutSession, resolveSessionUser, restoreSession } from '../../lib/native-session';
import { getSessionSnapshot, invalidateSession, subscribeSession } from '../../lib/session-store';
import type { ReactNode } from 'react';
import type { UserResponse } from '../../types/api';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);

/** Restores access from refresh only, gates /me and clears query data when identity changes. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
  const queryClient = useQueryClient();
  useEffect(() => {
    const generation = getSessionSnapshot().generation;
    void restoreSession().catch((error: unknown) => {
      if (getSessionSnapshot().generation === generation) {
        invalidateSession('recovery', error instanceof Error ? error.message : 'Không thể khôi phục phiên');
      }
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || getSessionSnapshot().status !== 'authenticated') return;
      const current = getSessionSnapshot().generation;
      void resolveSessionUser(current).catch((error: unknown) => {
        if (getSessionSnapshot().generation === current) invalidateSession('recovery', error instanceof Error ? error.message : 'Không thể xác minh phiên');
      });
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => { queryClient.clear(); }, [snapshot.generation, queryClient]);
  const login = useCallback(async (email: string, password: string) => {
    await loginSession({ email, password });
    router.replace('/(tabs)');
  }, []);
  const logout = useCallback(async () => {
    try { await logoutSession(); } finally { router.replace('/(auth)/login'); }
  }, []);
  const refreshProfile = useCallback(async () => {
    await resolveSessionUser(getSessionSnapshot().generation);
  }, []);
  const value: AuthState = { token: snapshot.token, user: snapshot.user,
    isAuthenticated: snapshot.status === 'authenticated', isLoading: snapshot.status === 'restoring',
    sessionError: snapshot.error, login, logout, refreshProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Reads mandatory auth context. */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
/** Reads auth when optional embedding is supported. */
export function useOptionalAuth(): AuthState | null { return useContext(AuthContext); }
