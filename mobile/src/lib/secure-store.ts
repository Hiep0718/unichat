import * as ExpoSecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
export type SecureStoreKey = 'unichat_session' | 'access_token' | 'refresh_token' | 'user_profile';

/** Persists native Keychain data only; web credentials always use HttpOnly cookies. */
export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await ExpoSecureStore.setItemAsync(key, value);
}
/** Reads Keychain data, propagating corruption/availability failures to auth. */
export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return ExpoSecureStore.getItemAsync(key);
}
/** Deletes Keychain data; failure is reported instead of silently retaining a session. */
export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await ExpoSecureStore.deleteItemAsync(key);
}
/** Saves a supported native session key. */
export const saveSecureItem = (key: SecureStoreKey, value: string): Promise<void> => setItemAsync(key, value);
/** Reads a supported native session key. */
export const getSecureItem = (key: SecureStoreKey): Promise<string | null> => getItemAsync(key);
/** Removes a supported native session key. */
export const deleteSecureItem = (key: SecureStoreKey): Promise<void> => deleteItemAsync(key);
export const SecureStore = { setItemAsync, getItemAsync, deleteItemAsync };
export default SecureStore;
