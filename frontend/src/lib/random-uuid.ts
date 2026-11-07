type UuidString = `${string}-${string}-${string}-${string}-${string}`;

/**
 * Generates a cryptographically random RFC 4122 version-4 UUID.
 * Falls back to `crypto.getRandomValues` when `crypto.randomUUID` is unavailable on plain HTTP origins.
 */
export function randomUuid(): UuidString {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Polyfills `crypto.randomUUID` on non-HTTPS origins (ADR-020 HTTP demo mode) using Web Crypto CSPRNG.
 */
export function installRandomUuidFallback(): void {
  if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.randomUUID === 'function') {
    return;
  }
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: randomUuid,
    configurable: true,
    writable: true,
  });
}

