import { createContext } from 'react';
import type { Dispatch } from 'react';

/** Content displayed for an active full-page loading request. */
export interface LoadingScreenDetails {
  readonly message: string;
  readonly brandTitle: string;
}

/** Registers or releases an independently owned full-page loading request. */
export type LoadingRequestAction =
  | { readonly type: 'register'; readonly requestId: string; readonly details: LoadingScreenDetails }
  | { readonly type: 'unregister'; readonly requestId: string };

/** Stable loading dispatch; null permits standalone loading screens. */
export const LoadingRequestContext = createContext<Dispatch<LoadingRequestAction> | null>(null);
