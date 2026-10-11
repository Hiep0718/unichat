import { ApiError, readApiResponse } from './api-error';
import { getApiBaseUrl, refreshAccessToken } from './cookie-session';
import { assertSessionGeneration, getSessionSnapshot, invalidateSession, storeAccessToken } from './session-store';

export { ApiError, getApiBaseUrl };
const compatibility = { clear: () => {}, set: (token: string) => { void token; } };

/** Legacy consumers register notifications; the memory store remains authoritative. */
export function registerTokenAccessor(getter: () => string | null, setter: (token: string) => void, clearer: () => void): void {
  compatibility.set = setter;
  compatibility.clear = clearer;
  const token = getter();
  if (token && token !== getSessionSnapshot().token) storeAccessToken(token);
}

/** Reads the current memory-only access token. */
export const getAccessToken = (): string | null => getSessionSnapshot().token;

/** Uses one auth coordinator for JSON, binary, FormData and SSE requests. */
export async function fetchAuthorized(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const snapshot = getSessionSnapshot();
  const send = (token: string | null) => fetch(`${getApiBaseUrl()}/api/v1${endpoint}`, {
    ...options, credentials: 'include', headers: requestHeaders(options, token),
  });
  const response = await send(snapshot.token);
  assertSessionGeneration(snapshot.generation);
  if (response.status !== 401 || endpoint.startsWith('/auth/')) return response;
  const token = getSessionSnapshot().revision !== snapshot.revision && getAccessToken()
    ? getAccessToken() as string : await refreshAccessToken();
  assertSessionGeneration(snapshot.generation);
  compatibility.set(token);
  const retry = await send(token);
  assertSessionGeneration(snapshot.generation);
  if (retry.status === 401) { invalidateSession(); compatibility.clear(); }
  return retry;
}

function requestHeaders(options: RequestInit, token: string | null): Headers {
  const headers = new Headers(options.headers);
  const formData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!headers.has('Content-Type') && !formData) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  else headers.delete('Authorization');
  return headers;
}

/** Fetches JSON or no-content API responses, suppressing stale identities. */
export async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const generation = getSessionSnapshot().generation;
  const data = await readApiResponse<T>(await fetchAuthorized(endpoint, options));
  assertSessionGeneration(generation);
  return data;
}

/** Fetches a protected binary resource with the same refresh and race policy. */
export async function fetchBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const generation = getSessionSnapshot().generation;
  const response = await fetchAuthorized(path, options);
  if (!response.ok) throw new ApiError(response.status, 'Không tải được dữ liệu');
  const blob = await response.blob();
  assertSessionGeneration(generation);
  return blob;
}
