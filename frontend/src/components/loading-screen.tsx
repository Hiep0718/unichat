import { useContext, useId, useLayoutEffect } from 'react';
import { LoadingRequestContext } from './loading-screen-context';
import { LoadingScreenView } from './loading-screen-view';
import type { Dispatch } from 'react';
import type { LoadingRequestAction, LoadingScreenDetails } from './loading-screen-context';

/** Optional content and layout for a full-page or container loading screen. */
export interface LoadingScreenProps {
  readonly message?: string;
  readonly brandTitle?: string;
  readonly fullScreen?: boolean;
}

interface LoadingRequestProps extends LoadingScreenDetails {
  readonly dispatch: Dispatch<LoadingRequestAction>;
}

function LoadingRequest({ dispatch, message, brandTitle }: LoadingRequestProps) {
  const requestId = useId();
  useLayoutEffect(() => {
    dispatch({ type: 'register', requestId, details: { message, brandTitle } });
    return () => dispatch({ type: 'unregister', requestId });
  }, [dispatch, requestId, message, brandTitle]);
  return null;
}

/** Shares full-page loading ownership, or renders directly outside a provider. */
export function LoadingScreen({
  message = 'Đang tải thông tin Workspace...',
  brandTitle = 'UniChat AI Platform',
  fullScreen = true,
}: LoadingScreenProps) {
  const dispatch = useContext(LoadingRequestContext);
  if (fullScreen && dispatch) return <LoadingRequest dispatch={dispatch} message={message} brandTitle={brandTitle} />;
  return <LoadingScreenView message={message} brandTitle={brandTitle} fullScreen={fullScreen} />;
}

/** Accessible label for a lightweight section loader. */
export interface LoadingInlineProps {
  readonly label?: string;
}

/**
 * Lightweight inline section spinner for tabs and tables.
 */
export function LoadingInline({ label = 'Đang tải dữ liệu...' }: LoadingInlineProps) {
  return (
    <div className="loading-inline" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-inline__spinner" aria-hidden="true" />
      <span className="loading-inline__text">{label}</span>
    </div>
  );
}
