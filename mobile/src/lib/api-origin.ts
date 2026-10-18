import Constants from 'expo-constants';

/**
 * Whether a configured value is a base URL that can actually be reached.
 *
 * Checking for a host, not only a scheme. `EXPO_PUBLIC_API_URL=http://` passed
 * a scheme-only test and was returned as the base URL, so every request went
 * to an address with no host — and the Expo Go fallback below, which would
 * have worked, was never reached. A setting that is present but unusable has
 * to lose to one that works.
 *
 * A regex rather than `new URL()`: React Native's URL is a polyfill whose
 * hostname parsing has not always been reliable, and this runs on every
 * request path.
 */
function isReachable(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^https?:\/\/[^/\s:]+(:\d+)?(\/.*)?$/.test(value.trim());
}

/** Resolves explicit environment/configuration before the Expo Go development host. */
export function getApiBaseUrl(): string {
  const fromEnvironment = process.env.EXPO_PUBLIC_API_URL;
  const fromConfig = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

  for (const candidate of [fromEnvironment, fromConfig]) {
    if (isReachable(candidate)) return candidate.trim().replace(/\/$/, '');
  }

  // Expo Go reaches the development server over the LAN, so the host it was
  // loaded from is the machine the API is on. This is the one that works on a
  // phone, where localhost is the phone itself.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:8082`;

  return 'http://localhost:8082';
}
