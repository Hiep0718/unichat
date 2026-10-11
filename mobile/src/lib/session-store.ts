import type { UserResponse } from '../types/api';
/** Observable, memory-only access identity and race counters. */
export interface SessionSnapshot {
  readonly token: string | null;
  readonly user: UserResponse | null;
  readonly generation: number;
  readonly revision: number;
  readonly status: 'restoring' | 'anonymous' | 'authenticated' | 'recovery';
  readonly error: string | null;
}
const state = { current: { token: null, user: null, generation: 0, revision: 0,
  status: 'restoring', error: null } as SessionSnapshot };
const listeners = new Set<() => void>();
/** Gets the current session without reading persisted access/profile snapshots. */
export const getSessionSnapshot = (): SessionSnapshot => state.current;
/** Subscribes React and HTTP consumers to identity changes. */
export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener); return () => listeners.delete(listener);
}
function publish(snapshot: SessionSnapshot): void {
  state.current = snapshot; listeners.forEach((listener) => listener());
}
/** Rejects callbacks from a replaced session. */
export function assertSessionGeneration(generation: number): void {
  if (generation !== state.current.generation) throw new Error('Phiên đã thay đổi');
}
/** Invalidates callbacks and clears every in-memory credential immediately. */
export function invalidateSession(status: SessionSnapshot['status'] = 'anonymous', error: string | null = null): number {
  publish({ token: null, user: null, generation: state.current.generation + 1,
    revision: state.current.revision + 1, status, error });
  return state.current.generation;
}
/** Applies an access token only to the initiating generation. */
export function storeAccessToken(token: string, generation = state.current.generation): void {
  assertSessionGeneration(generation);
  publish({ ...state.current, token, revision: state.current.revision + 1 });
}
/** Marks authenticated only after the active authoritative identity is resolved. */
export function storeSessionUser(user: UserResponse, generation = state.current.generation): void {
  assertSessionGeneration(generation);
  if (user.status !== 'ACTIVE') { invalidateSession(); return; }
  publish({ ...state.current, user, status: state.current.token ? 'authenticated' : 'anonymous', error: null });
}
