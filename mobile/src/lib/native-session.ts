import { ApiError, readApiResponse } from './api-error';
import { assertSessionGeneration, getSessionSnapshot, invalidateSession, storeAccessToken, storeSessionUser } from './session-store';
import { getApiBaseUrl } from './api-origin';
import * as SecureStore from './secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import type { MobileLoginResponse, UserResponse } from '../types/api';
import { advanceBrowserEpoch, readBrowserEpoch, readSessionMessage } from './browser-session-epoch';

const RECORD_KEY = 'unichat_session';
const recordSchema = z.discriminatedUnion('state', [
  z.object({ version: z.literal(1), state: z.literal('ACTIVE'), refreshToken: z.string().min(1) }),
  z.object({ version: z.literal(1), state: z.literal('SIGNED_OUT') }),
]);
type SessionRecord = z.infer<typeof recordSchema>;
const runtime = { storage: Promise.resolve() as Promise<unknown>, mutations: Promise.resolve() as Promise<unknown>,
  refresh: null as Promise<string> | null, refreshGeneration: -1, refreshToken: null as string | null,
  epoch: readBrowserEpoch(), channel: null as BroadcastChannel | null };
const TOMBSTONE = 'unichat.logged-out';

/** Runs auth transport changes in order, including web browser cookie locks. */
export function runAuthMutation<T>(action: () => Promise<T>): Promise<T> {
  const execute = () => Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('unichat.auth-cookie', action) : action();
  const pending = runtime.mutations.then(execute, execute);
  runtime.mutations = pending.then(() => undefined, () => undefined);
  return pending;
}

function browserTombstone(value?: boolean): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    if (value === true) localStorage.setItem(TOMBSTONE, '1');
    if (value === false) localStorage.removeItem(TOMBSTONE);
    return localStorage.getItem(TOMBSTONE) === '1';
  } catch { return value ?? false; }
}

function persistRecord(record: SessionRecord, generation: number): Promise<void> {
  const pending = runtime.storage.then(async () => {
    assertSessionGeneration(generation);
    if (Platform.OS === 'web') return;
    try { await SecureStore.setItemAsync(RECORD_KEY, JSON.stringify(record)); }
    catch (error: unknown) {
      if (record.state !== 'SIGNED_OUT') throw error;
      assertSessionGeneration(generation);
      await SecureStore.deleteItemAsync(RECORD_KEY);
    }
    assertSessionGeneration(generation);
  });
  runtime.storage = pending.then(() => undefined, () => undefined);
  return pending;
}

/** Removes legacy credentials and reads the sole native refresh record. */
export async function readNativeSession(): Promise<SessionRecord | null> {
  if (Platform.OS === 'web') return null;
  const generation = getSessionSnapshot().generation;
  await runtime.storage;
  assertSessionGeneration(generation);
  const stored = await SecureStore.getItemAsync(RECORD_KEY);
  const legacyRefresh = stored ? null : await SecureStore.getItemAsync('refresh_token');
  for (const key of ['access_token', 'refresh_token', 'user_profile']) {
    assertSessionGeneration(generation);
    await SecureStore.deleteItemAsync(key);
  }
  assertSessionGeneration(generation);
  if (stored) return recordSchema.parse(JSON.parse(stored) as unknown);
  if (!legacyRefresh) return null;
  const record: SessionRecord = { version: 1, state: 'ACTIVE', refreshToken: legacyRefresh };
  await persistRecord(record, getSessionSnapshot().generation);
  return record;
}

/** Sends native body credentials or browser cookies without mixing transports. */
export async function authRequest<T>(endpoint: string, body?: unknown): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (Platform.OS !== 'web') headers.set('X-Client-Type', 'mobile');
  else if (!__DEV__) {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/csrf`, { credentials: 'include' });
    const csrf = await readApiResponse<{ token: string; headerName: string }>(response);
    headers.set(csrf.headerName, csrf.token);
  }
  const response = await fetch(`${getApiBaseUrl()}/api/v1${endpoint}`, {
    method: 'POST', credentials: Platform.OS === 'web' ? 'include' : 'omit', headers,
    signal: AbortSignal.timeout(15_000), ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return readApiResponse<T>(response);
}

/** Checks identity before opening routes; profile snapshots cannot authenticate. */
export async function resolveSessionUser(generation: number): Promise<UserResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/users/me`, {
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
    headers: { Authorization: `Bearer ${getSessionSnapshot().token ?? ''}` }, signal: AbortSignal.timeout(15_000),
  });
  const profile = await readApiResponse<UserResponse>(response);
  assertSessionGeneration(generation);
  if (profile.status !== 'ACTIVE') throw new ApiError(403, 'Tài khoản không hoạt động');
  storeSessionUser(profile, generation);
  return profile;
}

function broadcast(type: 'invalidate' | 'token', epoch = readBrowserEpoch()): void {
  runtime.channel?.postMessage({ type, epoch, accessToken: type === 'token' ? getSessionSnapshot().token : undefined });
}

function startBrowserChannel(): void {
  if (Platform.OS !== 'web' || runtime.channel || typeof BroadcastChannel === 'undefined') return;
  runtime.channel = new BroadcastChannel('unichat.session');
  runtime.channel.onmessage = (event: MessageEvent<unknown>) => {
    const message = readSessionMessage(event.data);
    if (message?.type === 'invalidate') { runtime.epoch = message.epoch; invalidateSession(); }
    if (message?.type !== 'token' || typeof message.accessToken !== 'string' || browserTombstone()) return;
    const generation = message.epoch !== runtime.epoch ? invalidateSession('restoring') : getSessionSnapshot().generation;
    runtime.epoch = message.epoch;
    storeAccessToken(message.accessToken, generation);
    void resolveSessionUser(generation).catch((error: unknown) => markRecovery(error, generation));
  };
}

async function acceptCredentials(data: MobileLoginResponse, generation: number): Promise<void> {
  assertSessionGeneration(generation);
  if (Platform.OS !== 'web') {
    if (!data.refreshToken) throw new ApiError(502, 'Máy chủ không trả phiên đăng nhập hợp lệ');
    await persistRecord({ version: 1, state: 'ACTIVE', refreshToken: data.refreshToken }, generation);
    assertSessionGeneration(generation);
    runtime.refreshToken = data.refreshToken;
  }
  storeAccessToken(data.accessToken, generation);
}

async function markRecovery(error: unknown, generation: number): Promise<void> {
  if (getSessionSnapshot().generation !== generation) return;
  const definitive = error instanceof ApiError && [400, 401, 403].includes(error.status);
  const next = invalidateSession(definitive ? 'anonymous' : 'recovery', definitive
    ? 'Phiên đăng nhập đã hết hạn' : 'Không xác định được kết quả làm mới phiên. Vui lòng đăng nhập lại.');
  runtime.refreshToken = null;
  browserTombstone(true);
  broadcast('invalidate');
  await persistRecord({ version: 1, state: 'SIGNED_OUT' }, next);
}

/** Performs a single rotation for concurrent JSON/blob/SSE consumers. */
export function getOrRefreshToken(): Promise<string> {
  const snapshot = getSessionSnapshot();
  const epoch = readBrowserEpoch();
  if (runtime.refresh && runtime.refreshGeneration === snapshot.generation) return runtime.refresh;
  const pending = runAuthMutation(async () => {
    assertSessionGeneration(snapshot.generation);
    if (getSessionSnapshot().revision !== snapshot.revision && getSessionSnapshot().token) return getSessionSnapshot().token as string;
    const record = Platform.OS === 'web' ? null : await readNativeSession();
    assertSessionGeneration(snapshot.generation);
    if (browserTombstone() || (Platform.OS !== 'web' && record?.state !== 'ACTIVE')) throw new ApiError(401, 'Bạn đã đăng xuất');
    const body = record?.state === 'ACTIVE' ? { refreshToken: record.refreshToken } : undefined;
    const data = await authRequest<MobileLoginResponse>('/auth/refresh', body);
    if (Platform.OS === 'web' && epoch !== readBrowserEpoch()) throw new Error('Phiên đã thay đổi');
    await acceptCredentials(data, snapshot.generation);
    broadcast('token', epoch);
    return data.accessToken;
  }).catch(async (error: unknown) => {
    if (Platform.OS !== 'web' || epoch === readBrowserEpoch()) await markRecovery(error, snapshot.generation);
    throw error;
  });
  runtime.refresh = pending;
  runtime.refreshGeneration = snapshot.generation;
  void pending.finally(() => { if (runtime.refresh === pending) runtime.refresh = null; }).catch(() => undefined);
  return pending;
}

/** Starts a new identity and persists its refresh token before reporting success. */
export async function loginSession(credentials: { email: string; password: string }): Promise<MobileLoginResponse> {
  const generation = invalidateSession('restoring');
  const epoch = Platform.OS === 'web' ? advanceBrowserEpoch() : '';
  broadcast('invalidate');
  return runAuthMutation(async () => {
    if (browserTombstone()) await authRequest('/auth/logout');
    assertSessionGeneration(generation);
    const data = await authRequest<MobileLoginResponse>('/auth/login', credentials);
    if (Platform.OS === 'web' && epoch !== readBrowserEpoch()) throw new Error('Phiên đã thay đổi');
    await acceptCredentials(data, generation);
    await resolveSessionUser(generation);
    browserTombstone(false);
    runtime.epoch = epoch;
    broadcast('token', epoch);
    return data;
  }).catch(async (error: unknown) => {
    if (Platform.OS !== 'web' || epoch === readBrowserEpoch()) await markRecovery(error, generation);
    throw error;
  });
}

/** Clears identity immediately; the native tombstone prevents offline restoration. */
export async function logoutSession(): Promise<void> {
  const refreshToken = runtime.refreshToken;
  const generation = invalidateSession();
  if (Platform.OS === 'web') advanceBrowserEpoch();
  runtime.refreshToken = null;
  browserTombstone(true);
  broadcast('invalidate');
  const local = persistRecord({ version: 1, state: 'SIGNED_OUT' }, generation);
  const remote = runAuthMutation(() => authRequest('/auth/logout',
    Platform.OS === 'web' ? undefined : { refreshToken }));
  const outcomes = await Promise.allSettled([local, remote]);
  const localFailure = outcomes[0];
  const remoteFailure = outcomes[1];
  if (localFailure?.status === 'rejected') throw localFailure.reason;
  if (remoteFailure?.status === 'rejected') throw remoteFailure.reason;
  if (getSessionSnapshot().generation === generation) browserTombstone(false);
}

/** Restores a fresh access token and verifies /me, never using persisted access. */
export async function restoreSession(): Promise<void> {
  startBrowserChannel();
  if (browserTombstone()) { await logoutSession(); return; }
  const generation = getSessionSnapshot().generation;
  if (Platform.OS !== 'web') {
    const record = await readNativeSession();
    assertSessionGeneration(generation);
    if (record?.state !== 'ACTIVE') { invalidateSession(); return; }
    runtime.refreshToken = record.refreshToken;
  }
  await getOrRefreshToken();
  await resolveSessionUser(generation);
}
