import { Platform } from 'react-native';
import { router } from 'expo-router';
import { ApiError, readApiResponse } from './api-error';
import { getApiBaseUrl } from './api-origin';
import { getOrRefreshToken, logoutSession } from './native-session';
import { assertSessionGeneration, getSessionSnapshot, invalidateSession, storeAccessToken } from './session-store';
export { ApiError, getApiBaseUrl, getOrRefreshToken };

/** Stores access in memory only for compatibility with existing consumers. */
export function setAccessToken(token: string | null): void {
  if (token) storeAccessToken(token); else invalidateSession();
}
/** Reads access only from memory. */
export const getAccessToken = (): string | null => getSessionSnapshot().token;

/** Shares refresh/generation checks across JSON, uploads, binary and native SSE. */
export async function fetchAuthorized(endpoint: string, options: RequestInit = {}, transport: typeof fetch = fetch): Promise<Response> {
  const normalized = endpoint.startsWith('/api/v1') ? endpoint.slice(7) : endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const snapshot = getSessionSnapshot();
  const send = (token: string | null) => transport(`${getApiBaseUrl()}/api/v1${normalized}`, {
    ...options, credentials: Platform.OS === 'web' ? 'include' : 'omit', headers: requestHeaders(options, token),
  });
  const response = await send(snapshot.token);
  assertSessionGeneration(snapshot.generation);
  if (response.status !== 401 || normalized.startsWith('/auth/')) return response;
  const token = getSessionSnapshot().revision !== snapshot.revision && getAccessToken()
    ? getAccessToken() as string : await getOrRefreshToken();
  assertSessionGeneration(snapshot.generation);
  const retry = await send(token);
  assertSessionGeneration(snapshot.generation);
  if (retry.status === 401) invalidateSession();
  return retry;
}

function requestHeaders(options: RequestInit, token: string | null): Headers {
  const headers = new Headers(options.headers);
  if (!(typeof FormData !== 'undefined' && options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (Platform.OS !== 'web') headers.set('X-Client-Type', 'mobile');
  else headers.delete('X-Client-Type');
  if (token) headers.set('Authorization', `Bearer ${token}`); else headers.delete('Authorization');
  return headers;
}

/** Reads JSON, preventing a late body from populating a different account's cache. */
export async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const generation = getSessionSnapshot().generation;
  const data = await readApiResponse<T>(await fetchAuthorized(endpoint, options));
  assertSessionGeneration(generation);
  return data;
}

/** Logs out through the shared coordinator and navigates only after local invalidation. */
export async function clearAuthAndRedirect(): Promise<void> {
  try { await logoutSession(); } finally { router.replace('/(auth)/login'); }
}
