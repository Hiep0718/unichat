/**
 * Application-level providers wrapper.
 * Wraps children with query, loading and authentication providers.
 */

import { QueryClientProvider } from '@tanstack/react-query';

import { LoadingProvider } from '../components/loading-provider';
import { AuthProvider } from '../features/auth/auth-context';
import { ErrorBoundary } from '../features/errors/error-boundary';
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
            {children}
          </AuthProvider>
        </LoadingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
