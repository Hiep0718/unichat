import * as ExpoSecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type SecureStoreKey = 'access_token' | 'refresh_token' | 'user_profile';

/**
 * Safely saves a key-value pair (iOS Keychain / Android Keystore, fallback to localStorage on Web).
 */
export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore web storage errors
    }
    return;
  }
  try {
    await ExpoSecureStore.setItemAsync(key, value);
  } catch (error) {
    if (__DEV__) {
      console.warn(`[SecureStore] Failed to save key: ${key}`);
    }
    throw error;
  }
}

/**
 * Retrieves a value by key (iOS Keychain / Android Keystore, fallback to localStorage on Web).
 */
export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      return null;
    }
    return null;
  }
  try {
    return await ExpoSecureStore.getItemAsync(key);
  } catch (error) {
    if (__DEV__) {
      console.warn(`[SecureStore] Failed to retrieve key: ${key}`);
    }
    return null;
  }
}

/**
 * Deletes a key (iOS Keychain / Android Keystore, fallback to localStorage on Web).
 */
export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
    return;
  }
  try {
    await ExpoSecureStore.deleteItemAsync(key);
  } catch (error) {
    if (__DEV__) {
      console.warn(`[SecureStore] Failed to delete key: ${key}`);
    }
  }
}

export const saveSecureItem = (key: SecureStoreKey, value: string) => setItemAsync(key, value);
export const getSecureItem = (key: SecureStoreKey) => getItemAsync(key);
export const deleteSecureItem = (key: SecureStoreKey) => deleteItemAsync(key);

export const SecureStore = {
  setItemAsync,
  getItemAsync,
  deleteItemAsync,
};

export default SecureStore;

