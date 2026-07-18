/**
 * Application router configuration.
 * Defines routes with lazy-loaded page components and route guards.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthGuard, GuestGuard } from '../features/auth/route-guard';

const LandingPage = lazy(() => import('../features/landing/landing-page'));
const LoginPage = lazy(() => import('../features/auth/login-page'));
const RegisterPage = lazy(() => import('../features/auth/register-page'));
const ForgotPasswordPage = lazy(() => import('../features/auth/forgot-password-page'));
const WorkspaceListPage = lazy(() => import('../features/workspaces/workspace-list-page'));
const SettingsPage = lazy(() => import('../features/settings/settings-page'));

/**
 * Top-level router with lazy-loaded routes and authentication guards.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<GuestGuard><LoginPage /></GuestGuard>} />
          <Route path="/register" element={<GuestGuard><RegisterPage /></GuestGuard>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/workspaces" element={<AuthGuard><WorkspaceListPage /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
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
