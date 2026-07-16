import { AppProviders } from './app/app-providers';
import { AppRouter } from './app/app-router';

/**
 * Main application component.
 * Wraps the router with global providers.
 */
export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}