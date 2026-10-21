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
  // Expo Go reaches the development server over the LAN, so the host it was
  // loaded from is the machine the API is on. This is the one that works on a
  // phone, where localhost is the phone itself.
  const host = hostUri?.split(':')[0];
  if (isDevelopment && host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:8082`;
  return 'http://localhost:8082';
}

/**
 * Whether a configured value is a base URL that can actually be reached.
 *
 * Checking for a host, not only a scheme. `EXPO_PUBLIC_API_URL=http://` passed
 * a scheme-only test and was returned as the base URL, so every request went
 * to an address with no host — and the Expo Go fallback above, which would
 * have worked, was never reached. A setting that is present but unusable has
 * to lose to one that works.
 *
 * A regex rather than `new URL()`: React Native's URL is a polyfill whose
 * hostname parsing has not always been reliable, and this runs on every
 * request path.
 */
function normalizeApiBaseUrl(configured: string | undefined): string | null {
  const trimmed = configured?.trim();
  if (!trimmed || !/^https?:\/\/[^/\s:]+(:\d+)?(\/.*)?$/.test(trimmed)) return null;
  return trimmed.replace(/\/+$/, '');
}
