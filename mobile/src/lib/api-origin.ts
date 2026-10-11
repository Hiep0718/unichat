import Constants from 'expo-constants';

/** Resolves explicit environment/configuration before the Expo Go development host. */
export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  if (configured && /^https?:\/\//.test(configured)) return configured.trim().replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:8082`;
  return 'http://localhost:8082';
}
