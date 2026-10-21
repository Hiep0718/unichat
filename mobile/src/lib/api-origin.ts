import Constants from 'expo-constants';

/** Resolves an explicit API URL, then the reachable Expo host during development. */
export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim()
    || Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  return resolveApiBaseUrl(configured, Constants.expoConfig?.hostUri, __DEV__);
}

/** Resolves the API origin from explicit configuration or an Expo development host. */
export function resolveApiBaseUrl(configured: string | undefined, hostUri: string | undefined, isDevelopment: boolean): string {
  const validConfiguredUrl = normalizeApiBaseUrl(configured);
  if (validConfiguredUrl) return validConfiguredUrl;
  const host = hostUri?.split(':')[0];
  if (isDevelopment && host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:8082`;
  return 'http://localhost:8082';
}

function normalizeApiBaseUrl(configured: string | undefined): string | null {
  if (!configured?.trim()) return null;
  try {
    const parsed = new URL(configured.trim());
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null;
    return configured.trim().replace(/\/+$/, '');
  } catch {
    return null;
  }
}
