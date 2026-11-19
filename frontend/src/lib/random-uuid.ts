type UuidString = `${string}-${string}-${string}-${string}-${string}`;

/**
 * Builds a version-4 UUID from `crypto.getRandomValues`.
 *
 * Kept separate from {@link randomUuid} on purpose: the polyfill installs this
 * function as `crypto.randomUUID`. Installing `randomUuid` itself made it call
 * `crypto.randomUUID`, which was now itself — an infinite recursion on every
 * plain-HTTP origin.
 */
function generateV4Uuid(): UuidString {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Generates a cryptographically random RFC 4122 version-4 UUID.
 * Falls back to `crypto.getRandomValues` when `crypto.randomUUID` is unavailable on plain HTTP origins.
 *
 * The identity check is a second guard against the recursion described on
 * {@link generateV4Uuid}, in case anything else installs this function as
 * `crypto.randomUUID`.
 */
export function randomUuid(): UuidString {
  if (typeof globalThis.crypto?.randomUUID === 'function' && globalThis.crypto.randomUUID !== randomUuid) {
    return globalThis.crypto.randomUUID();
  }
  return generateV4Uuid();
}

/**
 * Polyfills `crypto.randomUUID` on non-HTTPS origins (ADR-020 HTTP demo mode) using Web Crypto CSPRNG.
 */
export function installRandomUuidFallback(): void {
  if (
    typeof globalThis.crypto === 'undefined'
    || (typeof globalThis.crypto.randomUUID === 'function' && globalThis.crypto.randomUUID !== randomUuid)
  ) {
    return;
  }
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: generateV4Uuid,
    configurable: true,
    writable: true,
  });
}
