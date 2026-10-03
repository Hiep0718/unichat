/**
 * HTTP Client for UniChat Mobile.
 * Implements Single-Flight Refresh Mutex and secure token storage via SecureStore.
 */

import * as SecureStore from './secure-store';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { MobileLoginResponse } from '../types/api';

export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** In-memory cached token accessor (ADR-005). */
let inMemoryToken: string | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryToken;
}

export function getApiBaseUrl(): string {
  // Dynamic host extraction in development:
  // When running via Expo Go on physical devices, auto-resolve Metro host IP to prevent
  // stale hardcoded LAN IPs in .env from causing network connection failures.
  if (__DEV__) {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any).manifest?.debuggerHost;

    if (typeof hostUri === 'string' && hostUri.includes(':')) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        return `http://${hostIp}:8082`;
      }
    }
  }

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  const configUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  if (configUrl) {
    return configUrl.endsWith('/') ? configUrl.slice(0, -1) : configUrl;
  }
  return 'http://localhost:8082';
}

// Single-Flight Mutex to prevent multiple concurrent requests from rotating tokens simultaneously
let refreshPromise: Promise<string> | null = null;

export async function getOrRefreshToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) {
        throw new ApiError(401, 'Không có phiên đăng nhập hợp lệ');
      }

      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'mobile',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        throw new ApiError(res.status, 'Phiên đăng nhập đã hết hạn');
      }

      const data: MobileLoginResponse = await res.json();
      inMemoryToken = data.accessToken;
      await SecureStore.setItemAsync('access_token', data.accessToken);
      if (data.refreshToken) {
        await SecureStore.setItemAsync('refresh_token', data.refreshToken);
      }
      return data.accessToken;
    } catch (err) {
      await clearAuthAndRedirect();
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function clearAuthAndRedirect(): Promise<void> {
  inMemoryToken = null;
  try {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_profile');
  } catch {
    // Ignore clear errors
  }
  router.replace('/(auth)/login');
}

/**
 * Universal fetch wrapper for API endpoints.
 */
export async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Client-Type', 'mobile');

  let token = inMemoryToken;
  if (!token) {
    token = await SecureStore.getItemAsync('access_token');
    if (token) inMemoryToken = token;
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const normalizedEndpoint = endpoint.startsWith('/api/v1')
    ? endpoint.slice(7)
    : endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;

  let response = await fetch(`${baseUrl}/api/v1${normalizedEndpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 with Single-Flight Refresh Mutex
  if (response.status === 401 && !normalizedEndpoint.startsWith('/auth/')) {
    try {
      const newToken = await getOrRefreshToken();
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(`${baseUrl}/api/v1${normalizedEndpoint}`, {
        ...options,
        headers,
      });
    } catch (refreshErr) {
      throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', refreshErr);
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let message = data?.detail || data?.title || data?.message || 'Đã xảy ra lỗi hệ thống';

    if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
      const fieldMessages = Object.values(data.fieldErrors).flat();
      if (fieldMessages.length > 0) {
        message = String(fieldMessages[0]);
      }
    }

    throw new ApiError(response.status, message, data);
  }

  return data as T;
}
