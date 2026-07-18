/**
 * Application-level providers wrapper.
 * Wraps children with QueryClientProvider and future AuthProvider.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

interface AppProvidersProps {
  readonly children: ReactNode;
}

/**
 * Wraps the application tree with all required context providers.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
