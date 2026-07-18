/**
 * Application router configuration.
 * Defines routes with lazy-loaded page components.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const LandingPage = lazy(() => import('../features/landing/landing-page'));
const LoginPage = lazy(() => import('../features/auth/login-page'));
const RegisterPage = lazy(() => import('../features/auth/register-page'));
const ForgotPasswordPage = lazy(() => import('../features/auth/forgot-password-page'));
const WorkspaceListPage = lazy(() => import('../features/workspaces/workspace-list-page'));
const SettingsPage = lazy(() => import('../features/settings/settings-page'));

/**
 * Top-level router with lazy-loaded routes for all 4 screens.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/workspaces" element={<WorkspaceListPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

/** Simple centered loading indicator. */
function PageLoader() {
  return (
    <div style={{
      display: 'grid',
      placeItems: 'center',
      minHeight: '100vh',
      color: 'var(--color-primary)',
      font: 'var(--font-body-lg)',
    }}>
      Đang tải...
    </div>
  );
}
