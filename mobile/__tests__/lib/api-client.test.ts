import {
  fetchJson,
  getAccessToken,
  setAccessToken,
  getApiBaseUrl,
  getOrRefreshToken,
} from '../../src/lib/api-client';
import * as SecureStore from 'expo-secure-store';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) || null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

describe('api-client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    setAccessToken(null);
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return default api base url if not overridden', () => {
    const url = getApiBaseUrl();
    expect(url).toBeTruthy();
  });

  it('should inject Bearer token into headers when available', async () => {
    setAccessToken('valid-mock-token');

    let interceptedHeaders: any = null;
    global.fetch = jest.fn(async (_url: any, init: any) => {
      interceptedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    await fetchJson('/workspaces');
    expect(interceptedHeaders?.get('Authorization')).toBe('Bearer valid-mock-token');
    expect(interceptedHeaders?.get('X-Client-Type')).toBe('mobile');
  });

  it('should handle Single-Flight Mutex when concurrent requests hit 401', async () => {
    // Setup stored refresh token
    await SecureStore.setItemAsync('refresh_token', 'initial-refresh-token');

    let refreshCallCount = 0;
    global.fetch = jest.fn(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/auth/refresh')) {
        refreshCallCount++;
        return new Response(
          JSON.stringify({
            accessToken: 'refreshed-access-token',
            refreshToken: 'new-rotated-refresh-token',
            tokenType: 'Bearer',
            expiresIn: 900,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Initial calls return 401 if token is not refreshed
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    // Fire 3 concurrent calls to getOrRefreshToken
    const results = await Promise.all([
      getOrRefreshToken(),
      getOrRefreshToken(),
      getOrRefreshToken(),
    ]);

    // All 3 callers must receive the exact same new access token
    expect(results[0]).toBe('refreshed-access-token');
    expect(results[1]).toBe('refreshed-access-token');
    expect(results[2]).toBe('refreshed-access-token');

    // Crucial: /auth/refresh was called EXACTLY ONCE despite 3 concurrent requests
    expect(refreshCallCount).toBe(1);
    expect(getAccessToken()).toBe('refreshed-access-token');
  });
});
