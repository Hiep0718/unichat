import { ApiError, readApiResponse } from './api-error';
import { assertSessionGeneration, getSessionSnapshot, invalidateSession, storeAccessToken, storeSessionUser } from './session-store';
import type { SessionUser } from './session-store';
import { advanceBrowserEpoch, readBrowserEpoch, readSessionMessage } from './browser-session-epoch';

interface AccessResponse { readonly accessToken: string; readonly tokenType: string; readonly expiresIn: number }
const runtime = { queue: Promise.resolve() as Promise<unknown>, refresh: null as Promise<string> | null,
  refreshGeneration: -1, epoch: readBrowserEpoch(), channel: null as BroadcastChannel | null, started: false };
const TOMBSTONE = 'unichat.logged-out';

/** Resolves the configured Core API origin, retaining same-origin development. */
export function getApiBaseUrl(): string {
  const custom = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return custom?.replace(/\/$/, '') ?? '';
}

function tombstone(value?: boolean): boolean {
  try {
    if (value === true) localStorage.setItem(TOMBSTONE, '1');
    if (value === false) localStorage.removeItem(TOMBSTONE);
    return localStorage.getItem(TOMBSTONE) === '1';
  } catch { return value ?? false; }
}

/** Serializes cookie-changing requests across this tab and compatible browsers. */
export function runCookieMutation<T>(action: () => Promise<T>): Promise<T> {
  const execute = () => typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('unichat.auth-cookie', action) : action();
  const pending = runtime.queue.then(execute, execute);
  runtime.queue = pending.then(() => undefined, () => undefined);
  return pending;
}

/** Sends cookie auth requests with production CSRF protection when enabled. */
export async function cookieRequest<T>(endpoint: string, body?: unknown): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (import.meta.env.PROD) {
    const csrf = await fetch(`${getApiBaseUrl()}/api/v1/auth/csrf`, { credentials: 'include' });
    const token = await readApiResponse<{ token: string; headerName: string }>(csrf);
    headers.set(token.headerName, token.token);
  }
  const response = await fetch(`${getApiBaseUrl()}/api/v1${endpoint}`, {
    method: 'POST', credentials: 'include', headers, signal: AbortSignal.timeout(15_000),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return readApiResponse<T>(response);
}

function notifyInvalidation(): void { runtime.channel?.postMessage({ type: 'invalidate', epoch: readBrowserEpoch() }); }
function notifyToken(token: string, epoch: string): void {
  runtime.channel?.postMessage({ type: 'token', epoch, accessToken: token });
}

/** Installs cross-tab invalidation without persisting access or refresh tokens. */
export function startSessionChannel(): void {
  if (runtime.started || typeof BroadcastChannel === 'undefined') return;
  runtime.started = true;
  runtime.channel = new BroadcastChannel('unichat.session');
  runtime.channel.onmessage = (event: MessageEvent<unknown>) => {
    const message = readSessionMessage(event.data);
    if (message?.type === 'invalidate') { runtime.epoch = message.epoch; invalidateSession(); }
    if (message?.type === 'token' && typeof message.accessToken === 'string' && !tombstone()) {
      const generation = message.epoch !== runtime.epoch ? invalidateSession('restoring') : getSessionSnapshot().generation;
      runtime.epoch = message.epoch;
      storeAccessToken(message.accessToken, generation);
      void resolveSessionUser(generation).catch(() => {
        if (getSessionSnapshot().generation === generation) invalidateSession('recovery', 'Cần xác minh lại phiên đăng nhập');
      });
    }
  };
}

/** Resolves /me before reporting a restored or newly logged-in session. */
export async function resolveSessionUser(generation: number): Promise<SessionUser> {
  const token = getSessionSnapshot().token;
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me`, {
    credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(15_000),
  });
  const profile = await readApiResponse<SessionUser>(response);
  assertSessionGeneration(generation);
  storeSessionUser(profile, generation);
  return profile;
}

/** Refreshes once; uncertain rotation requires reauthentication instead of replay. */
export function refreshAccessToken(): Promise<string> {
  const snapshot = getSessionSnapshot();
  const epoch = readBrowserEpoch();
  if (runtime.refresh && runtime.refreshGeneration === snapshot.generation) return runtime.refresh;
  const pending = runCookieMutation(async () => {
    assertSessionGeneration(snapshot.generation);
    if (tombstone()) throw new ApiError(401, 'Bạn đã đăng xuất');
    if (getSessionSnapshot().revision !== snapshot.revision && getSessionSnapshot().token) return getSessionSnapshot().token as string;
    const data = await cookieRequest<AccessResponse>('/auth/refresh');
    if (epoch !== readBrowserEpoch()) throw new DOMException('Phiên đã thay đổi', 'AbortError');
    storeAccessToken(data.accessToken, snapshot.generation);
    notifyToken(data.accessToken, epoch);
    return data.accessToken;
  }).catch((error: unknown) => {
    if (getSessionSnapshot().generation === snapshot.generation && epoch === readBrowserEpoch()) {
      const definitive = error instanceof ApiError && [400, 401].includes(error.status);
      invalidateSession(definitive ? 'anonymous' : 'recovery', definitive
        ? 'Phiên đăng nhập đã hết hạn' : 'Không xác định được kết quả làm mới phiên. Vui lòng đăng nhập lại.');
      if (!definitive) tombstone(true);
      advanceBrowserEpoch();
      notifyInvalidation();
    }
    throw error;
  });
  runtime.refresh = pending;
  runtime.refreshGeneration = snapshot.generation;
  void pending.finally(() => { if (runtime.refresh === pending) runtime.refresh = null; }).catch(() => undefined);
  return pending;
}

/** Logs in atomically with cookie changes, storage tombstone and /me validation. */
export async function loginCookieSession(credentials: { email: string; password: string }): Promise<AccessResponse> {
  const generation = invalidateSession('restoring');
  const epoch = advanceBrowserEpoch();
  const progress = { sentLogin: false, issuedCookie: false };
  notifyInvalidation();
  return runCookieMutation(async () => {
    if (tombstone()) { await cookieRequest('/auth/logout'); tombstone(false); }
    assertSessionGeneration(generation);
    if (epoch !== readBrowserEpoch()) throw new DOMException('Phiên đã thay đổi', 'AbortError');
    progress.sentLogin = true;
    const data = await cookieRequest<AccessResponse>('/auth/login', credentials);
    progress.issuedCookie = true;
    if (epoch !== readBrowserEpoch()) throw new DOMException('Phiên đã thay đổi', 'AbortError');
    storeAccessToken(data.accessToken, generation);
    await resolveSessionUser(generation);
    tombstone(false);
    runtime.epoch = epoch;
    notifyToken(data.accessToken, epoch);
    return data;
  }).catch((error: unknown) => {
    if (getSessionSnapshot().generation === generation) {
      invalidateSession('anonymous');
      if (progress.issuedCookie || (progress.sentLogin && (!(error instanceof ApiError) || error.status >= 500))) {
        tombstone(true);
      }
    }
    throw error;
  });
}

/** Clears identity immediately, then revokes the cookie in serialized order. */
export async function logoutCookieSession(): Promise<void> {
  const generation = invalidateSession();
  advanceBrowserEpoch();
  tombstone(true);
  notifyInvalidation();
  await runCookieMutation(() => cookieRequest('/auth/logout'));
  if (getSessionSnapshot().generation === generation) tombstone(false);
}

/** Restores an identity only after refresh and /me; pending offline logout wins. */
export async function restoreCookieSession(): Promise<void> {
  startSessionChannel();
  if (tombstone()) { await logoutCookieSession(); return; }
  const generation = getSessionSnapshot().generation;
  await refreshAccessToken();
  await resolveSessionUser(generation);
}
