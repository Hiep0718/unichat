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
import { authApi } from './api/auth-api';

interface UserProfile {
  readonly id: string;
  readonly email: string;
  /** The name others see; distinct from the @mention handle. */
  readonly displayName: string;
  readonly systemRole: 'USER' | 'ADMIN';
  readonly status: 'ACTIVE' | 'LOCKED';
}

interface AuthState {
  /** Current access token held in memory. */
  readonly token: string | null;
  /** Current authenticated user profile. */
  readonly user: UserProfile | null;
  /** Whether the user has an active access token. */
  readonly isAuthenticated: boolean;
  /** Stores a new access token in memory. */
  readonly setToken: (token: string, user?: UserProfile) => void;
  /** Sets user profile manually. */
  readonly setUser: (user: UserProfile | null) => void;
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
  const [user, setUserState] = useState<UserProfile | null>(null);

  const setToken = useCallback((newToken: string, newUser?: UserProfile) => {
    setTokenState(newToken);
    if (newUser) {
      setUserState(newUser);
    }
  }, []);

  const setUser = useCallback((newUser: UserProfile | null) => {
    setUserState(newUser);
  }, []);

  const clearToken = useCallback(() => {
    setTokenState(null);
    setUserState(null);
  }, []);

  // Register accessor so api-client can read/write token without React coupling
  useEffect(() => {
    registerTokenAccessor(
      () => token,
      (refreshed: string) => setTokenState(refreshed),
      () => {
        setTokenState(null);
        setUserState(null);
      },
    );
  }, [token]);

  // Resolve the profile whenever a token arrives without one. Login only stores
  // the token, so without this `user` stays null and anything keyed on the
  // current user id (such as accepting an answer on your own post) never works.
  useEffect(() => {
    if (!token || user) return;

    let cancelled = false;
    authApi
      .getMe()
      .then((profile) => {
        if (!cancelled) {
          setUserState({
            id: profile.id,
            email: profile.email,
            displayName: profile.displayName,
            systemRole: profile.systemRole,
            status: profile.status,
          });
        }
      })
      .catch(() => {
        // Leaving the profile unset is safe: the token still authenticates
        // requests, only user-specific UI stays hidden.
      });

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      isAuthenticated: token !== null,
      setToken,
      setUser,
      clearToken,
    }),
    [token, user, setToken, setUser, clearToken],
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

