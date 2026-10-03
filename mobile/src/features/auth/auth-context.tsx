import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import * as SecureStore from '../../lib/secure-store';
import { router } from 'expo-router';
import { authApi } from './auth-api';
import { setAccessToken } from '../../lib/api-client';
import { UserResponse } from '../../types/api';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from SecureStore on app launch
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedToken = await SecureStore.getItemAsync('access_token');
        const storedProfile = await SecureStore.getItemAsync('user_profile');

        if (storedToken && isMounted) {
          setTokenState(storedToken);
          setAccessToken(storedToken);

          if (storedProfile) {
            try {
              setUserState(JSON.parse(storedProfile));
            } catch {
              // Ignore parse error
            }
          }

          // Fetch fresh user profile in background
          authApi
            .getMe()
            .then((freshUser) => {
              if (isMounted) {
                setUserState(freshUser);
                SecureStore.setItemAsync('user_profile', JSON.stringify(freshUser));
              }
            })
            .catch(() => {
              // Silent fail if network is offline on startup
            });
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[AuthProvider] Failed to restore session', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setTokenState(res.accessToken);
    setAccessToken(res.accessToken);

    await SecureStore.setItemAsync('access_token', res.accessToken);
    await SecureStore.setItemAsync('refresh_token', res.refreshToken);

    try {
      const profile = await authApi.getMe();
      setUserState(profile);
      await SecureStore.setItemAsync('user_profile', JSON.stringify(profile));
    } catch {
      // Allow login even if getMe fails temporarily
    }

    router.replace('/(tabs)');
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Proceed with local cleanup even if remote revoke fails
    } finally {
      setTokenState(null);
      setUserState(null);
      setAccessToken(null);

      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('user_profile');

      router.replace('/(auth)/login');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authApi.getMe();
      setUserState(profile);
      await SecureStore.setItemAsync('user_profile', JSON.stringify(profile));
    } catch (err) {
      if (__DEV__) {
        console.warn('[AuthProvider] Failed to refresh profile', err);
      }
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      isAuthenticated: token !== null,
      isLoading,
      login,
      logout,
      refreshProfile,
    }),
    [token, user, isLoading, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
