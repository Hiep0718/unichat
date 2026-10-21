/**
 * Application-level providers wrapper.
 * Wraps children with query, loading and authentication providers.
 */

import { QueryClientProvider } from '@tanstack/react-query';

import { LoadingProvider } from '../components/loading-provider';
import { AuthProvider } from '../features/auth/auth-context';
import { CallProvider } from '../features/calls/call-provider';
import { CallOverlay } from '../features/calls/components/call-overlay';
import { ErrorBoundary } from '../features/errors/error-boundary';
import { RealtimeProvider } from '../features/realtime/realtime-provider';
import { queryClient } from '../lib/query-client';
import type { ReactNode } from 'react';

/** Application content supported by all required providers. */
interface AppProvidersProps {
  readonly children: ReactNode;
}

/**
 * Wraps the application tree with all required context providers.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LoadingProvider>
          <AuthProvider>
            {/* Inside AuthProvider because the socket authenticates with the
                session token, and above the routes so it survives navigation
                instead of belonging to whichever page happens to be open. */}
            <RealtimeProvider>
              {/* Inside RealtimeProvider because a call is signalled over that
                  socket, and above the routes because a call outlives the
                  screen it was started from. */}
              <CallProvider>
                {children}
                {/* Rendered here rather than inside CallProvider so the panel
                    can read the context without the provider importing it. */}
                <CallOverlay />
              </CallProvider>
            </RealtimeProvider>
          </AuthProvider>
        </LoadingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
