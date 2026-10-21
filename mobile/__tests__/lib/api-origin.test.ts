import { resolveApiBaseUrl } from '../../src/lib/api-origin';

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
