import { getApiBaseUrl, resolveApiBaseUrl } from '../../src/lib/api-origin';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: {} as Record<string, unknown> },
}));

const Constants = require('expo-constants').default as {
  expoConfig: { hostUri?: string; extra?: { apiBaseUrl?: string } } | null;
};

function given(options: {
  env?: string;
  configured?: string;
  hostUri?: string;
}) {
  if (options.env === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = options.env;

  Constants.expoConfig = {
    hostUri: options.hostUri,
    extra: options.configured ? { apiBaseUrl: options.configured } : undefined,
  };
}

describe('getApiBaseUrl', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('should use the configured URL when it points somewhere', () => {
    given({ env: 'http://192.168.1.50:8082' });

    expect(getApiBaseUrl()).toBe('http://192.168.1.50:8082');
  });

  it('should fall through to the Expo host when the configured URL has no host', () => {
    // dev.ps1 wrote exactly this for months: "http://$lanIp:8082" in PowerShell
    // reads $lanIp:8082 as a scope-qualified variable, so the host and port
    // vanished. A scheme-only check accepted it and every request on the phone
    // went nowhere, while this fallback would have worked.
    given({ env: 'http://', hostUri: '192.168.1.50:8081' });

    expect(getApiBaseUrl()).toBe('http://192.168.1.50:8082');
  });

  it('should ignore an empty setting rather than treat it as configured', () => {
    given({ env: '', hostUri: '192.168.1.50:8081' });

    expect(getApiBaseUrl()).toBe('http://192.168.1.50:8082');
  });

  it('should prefer the environment over app config', () => {
    given({ env: 'http://10.0.0.5:8082', configured: 'http://192.168.1.50:8082' });

    expect(getApiBaseUrl()).toBe('http://10.0.0.5:8082');
  });

  it('should use app config when the environment is unusable', () => {
    given({ env: 'http://', configured: 'https://api.unichat.vn' });

    expect(getApiBaseUrl()).toBe('https://api.unichat.vn');
  });

  it('should drop a trailing slash so paths are not doubled', () => {
    given({ env: 'http://192.168.1.50:8082/' });

    expect(getApiBaseUrl()).toBe('http://192.168.1.50:8082');
  });

  it('should not use the Expo host when it is loopback', () => {
    // On a phone, localhost is the phone, so this would be worse than useless.
    given({ hostUri: 'localhost:8081' });

    expect(getApiBaseUrl()).toBe('http://localhost:8082');
  });
});

describe('resolveApiBaseUrl', () => {
  it('should prefer an explicitly configured API URL', () => {
    expect(resolveApiBaseUrl('https://api.example.test/', '192.168.1.20:8081', true))
      .toBe('https://api.example.test');
  });

  it('should use the Expo development host when no API URL is configured', () => {
    expect(resolveApiBaseUrl(undefined, '192.168.1.20:8081', true))
      .toBe('http://192.168.1.20:8082');
  });

  it('should ignore an incomplete API URL and use the Expo development host', () => {
    expect(resolveApiBaseUrl('http://', '192.168.1.20:8081', true))
      .toBe('http://192.168.1.20:8082');
  });

  it('should use localhost when the Expo host is unavailable', () => {
    expect(resolveApiBaseUrl(undefined, 'localhost:8081', true))
      .toBe('http://localhost:8082');
  });

  it('should not use the Expo host outside development', () => {
    expect(resolveApiBaseUrl(undefined, '192.168.1.20:8081', false))
      .toBe('http://localhost:8082');
  });
});
