import * as Crypto from 'expo-crypto';

/**
 * Generates a RFC 4122 compliant v4 UUID for Idempotency-Key headers.
 */
export function generateIdempotencyKey(): string {
  return Crypto.randomUUID();
}
