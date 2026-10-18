/**
 * Application-level providers wrapper.
 * Wraps children with QueryClientProvider and AuthProvider.
 */

import { QueryClientProvider } from '@tanstack/react-query';

import type { ReactNode } from 'react';

import { AuthProvider } from '../features/auth/auth-context';
import { RealtimeProvider } from '../features/realtime/realtime-provider';
import { queryClient } from '../lib/query-client';

interface AppProvidersProps {
  readonly children: ReactNode;
}

import { ErrorBoundary } from '../features/errors/error-boundary';

/**
 * Wraps the application tree with all required context providers.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* Inside AuthProvider because the socket authenticates with the
              session token, and above the routes so it survives navigation
              instead of belonging to whichever page happens to be open. */}
          <RealtimeProvider>
            {children}
          </RealtimeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
