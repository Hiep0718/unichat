/**
 * Application router configuration.
 * Defines routes with lazy-loaded page components and route guards.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthGuard, GuestGuard } from '../features/auth/route-guard';
import { AppShell } from './app-shell';

const LandingPage = lazy(() => import('../features/landing/landing-page'));
const LoginPage = lazy(() => import('../features/auth/login-page'));
const RegisterPage = lazy(() => import('../features/auth/register-page'));
const ForgotPasswordPage = lazy(() => import('../features/auth/forgot-password-page'));
const WorkspaceListPage = lazy(() => import('../features/workspaces/workspace-list-page'));
const AccountPage = lazy(() => import('../features/account/settings-page'));
const NotFoundPage = lazy(() => import('../features/errors/not-found-page').then(m => ({ default: m.NotFoundPage })));

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
          
          <Route element={<AuthGuard><AppShell /></AuthGuard>}>
            <Route path="/workspaces" element={<WorkspaceListPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
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
