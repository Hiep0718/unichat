import { afterEach, describe, expect, it, vi } from 'vitest';

import { installRandomUuidFallback, randomUuid } from './random-uuid';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomUuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should delegate to native crypto.randomUUID when available', () => {
    const expected = '11111111-2222-4333-8444-555555555555';
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => expected),
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    });

    expect(randomUuid()).toBe(expected);
  });

  it('should generate valid RFC 4122 v4 UUIDs via getRandomValues on plain HTTP origins', () => {
    const nativeGetRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal('crypto', {
      randomUUID: undefined,
      getRandomValues: nativeGetRandomValues,
    });

    const first = randomUuid();
    const second = randomUuid();

    expect(first).toMatch(UUID_V4_PATTERN);
    expect(second).toMatch(UUID_V4_PATTERN);
    expect(first).not.toBe(second);
  });

  it('should polyfill crypto.randomUUID when missing on plain HTTP origins', () => {
    const nativeGetRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    const mockCrypto: { getRandomValues: typeof nativeGetRandomValues; randomUUID?: () => string } = {
      getRandomValues: nativeGetRandomValues,
    };
    vi.stubGlobal('crypto', mockCrypto);

    installRandomUuidFallback();

    expect(typeof globalThis.crypto.randomUUID).toBe('function');
    expect(globalThis.crypto.randomUUID()).toMatch(UUID_V4_PATTERN);
  });
});

