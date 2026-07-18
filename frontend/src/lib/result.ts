/**
 * Expected failure union for service operations (file-plan lib/result.ts).
 */

export type Result<T, E = AppFailure> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: E };

export interface AppFailure {
  readonly code: string;
  readonly message: string;
  readonly fieldErrors?: Record<string, string[]>;
}

export function success<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function failure<E = AppFailure>(error: E): Result<never, E> {
  return { ok: false, error };
}
