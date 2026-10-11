/** Identity resolved from the authoritative /users/me response. */
export interface SessionUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly systemRole: 'USER' | 'ADMIN';
  readonly status: 'ACTIVE' | 'LOCKED';
}

/** A token never makes a session authenticated before identity is checked. */
export interface SessionSnapshot {
  readonly token: string | null;
  readonly user: SessionUser | null;
  readonly generation: number;
  readonly revision: number;
  readonly status: 'restoring' | 'anonymous' | 'authenticated' | 'recovery';
  readonly error: string | null;
}

const state = { current: { token: null, user: null, generation: 0, revision: 0,
  status: 'restoring', error: null } as SessionSnapshot };
const listeners = new Set<() => void>();

/** Reads immutable memory-only state for React and HTTP consumers. */
export const getSessionSnapshot = (): SessionSnapshot => state.current;

/** Observes token, identity and generation updates. */
export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Rejects results belonging to a logged-out or replaced identity. */
export function assertSessionGeneration(generation: number): void {
  if (generation !== state.current.generation) throw new DOMException('Phiên đã thay đổi', 'AbortError');
}

function publish(snapshot: SessionSnapshot): void {
  state.current = snapshot;
  listeners.forEach((listener) => listener());
}

/** Invalidates pending responses and clears every in-memory credential. */
export function invalidateSession(status: SessionSnapshot['status'] = 'anonymous', error: string | null = null): number {
  publish({ token: null, user: null, generation: state.current.generation + 1,
    revision: state.current.revision + 1, status, error });
  return state.current.generation;
}

/** Applies an access token only to its initiating generation. */
export function storeAccessToken(token: string, generation = state.current.generation): void {
  assertSessionGeneration(generation);
  publish({ ...state.current, token, revision: state.current.revision + 1 });
}

/** Opens protected routes only after a current, active identity is resolved. */
export function storeSessionUser(user: SessionUser | null, generation = state.current.generation): void {
  assertSessionGeneration(generation);
  if (user && user.status !== 'ACTIVE') { invalidateSession('anonymous', 'Tài khoản đã bị khóa'); return; }
  publish({ ...state.current, user, status: user && state.current.token ? 'authenticated' : 'anonymous', error: null });
}
