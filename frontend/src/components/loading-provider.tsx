import { useReducer } from 'react';
import { LoadingRequestContext } from './loading-screen-context';
import { LoadingScreenView } from './loading-screen-view';
import type { ReactNode } from 'react';
import type { LoadingRequestAction, LoadingScreenDetails } from './loading-screen-context';

/** Children whose full-page loading requests share a persistent visual. */
export interface LoadingProviderProps {
  readonly children: ReactNode;
}

function updateLoadingRequests(
  requests: ReadonlyMap<string, LoadingScreenDetails>,
  action: LoadingRequestAction,
): ReadonlyMap<string, LoadingScreenDetails> {
  const nextRequests = new Map(requests);
  if (action.type === 'register') {
    nextRequests.set(action.requestId, action.details);
    return nextRequests;
  }
  nextRequests.delete(action.requestId);
  return nextRequests;
}

/** Keeps one loading visual mounted across overlapping and successive phases. */
export function LoadingProvider({ children }: LoadingProviderProps) {
  const [requests, dispatch] = useReducer(updateLoadingRequests, new Map<string, LoadingScreenDetails>());
  const activeRequest = Array.from(requests.values()).at(-1);
  return (
    <LoadingRequestContext.Provider value={dispatch}>
      <div className="loading-provider__content" inert={Boolean(activeRequest)} aria-hidden={activeRequest ? true : undefined}>
        {children}
      </div>
      <LoadingScreenView
        message={activeRequest?.message ?? 'Đang tải thông tin Workspace...'}
        brandTitle={activeRequest?.brandTitle ?? 'UniChat AI Platform'}
        fullScreen visible={Boolean(activeRequest)}
      />
    </LoadingRequestContext.Provider>
  );
}
