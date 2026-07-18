/* eslint-disable react-refresh/only-export-components */
/**
 * Authentication context — stores access token in memory only (ADR-005).
 * Never persists token to localStorage, sessionStorage, or cookies.
 * Registers a token accessor with api-client for Bearer header injection.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { ReactNode } from 'react';

import { registerTokenAccessor } from '../../lib/api-client';

interface AuthState {
  /** Current access token held in memory. */
  readonly token: string | null;
  /** Whether the user has an active access token. */
  readonly isAuthenticated: boolean;
  /** Stores a new access token in memory. */
  readonly setToken: (token: string) => void;
  /** Clears the access token from memory. */
  readonly clearToken: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  readonly children: ReactNode;
}

/**
 * Wraps the component tree with in-memory access token state.
 * Registers a token accessor with the api-client module on mount.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setTokenState] = useState<string | null>(null);

  const setToken = useCallback((newToken: string) => {
    setTokenState(newToken);
  }, []);

  const clearToken = useCallback(() => {
    setTokenState(null);
  }, []);

  // Register accessor so api-client can read/write token without React coupling
  useEffect(() => {
    registerTokenAccessor(
      () => token,
      (refreshed: string) => setTokenState(refreshed),
      () => setTokenState(null),
    );
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      token,
      isAuthenticated: token !== null,
      setToken,
      clearToken,
    }),
    [token, setToken, clearToken],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/**
 * Hook to access authentication state. Must be used within AuthProvider.
 */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
