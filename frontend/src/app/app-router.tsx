/**
 * Application router configuration (UI Spec §2).
 * Defines routes with lazy-loaded page components and route guards.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';

import { AuthGuard, GuestGuard, AdminGuard } from '../features/auth/route-guard';
import { AppShell } from './app-shell';
import { WorkspaceShell } from './workspace-shell';

const LandingPage = lazy(() => import('../features/landing/landing-page'));
const LoginPage = lazy(() => import('../features/auth/login-page'));
const RegisterPage = lazy(() => import('../features/auth/register-page'));
const ForgotPasswordPage = lazy(() => import('../features/auth/forgot-password-page'));

const WorkspaceListPage = lazy(() => import('../features/workspaces/workspace-list-page'));
const WorkspaceDetailPage = lazy(() => import('../features/workspaces/workspace-detail-page'));
const WorkspaceOverviewPage = lazy(() =>
  import('../features/workspaces/workspace-overview-page').then((m) => ({
    default: m.WorkspaceOverviewPage,
  })),
);

const FeedPage = lazy(() => import('../features/community/feed-page').then((m) => ({ default: m.FeedPage })));
const PostDetailPage = lazy(() => import('../features/community/post-detail-page'));

const DocumentPage = lazy(() => import('../features/documents/document-page'));
const ChatPage = lazy(() => import('../features/chat/chat-page'));
const ConversationListPage = lazy(() => import('../features/history/conversation-list-page'));
const ConversationPage = lazy(() => import('../features/history/conversation-page'));
const WorkspaceSettingsPage = lazy(() => import('../features/settings/settings-page'));
const EvaluationPage = lazy(() => import('../features/evaluation/evaluation-page'));
const DiscussionPage = lazy(() => import('../features/community/discussion-page'));

const AccountPage = lazy(() => import('../features/account/settings-page'));
const AdminUserPage = lazy(() => import('../features/admin/admin-user-page'));
const AdminMetricPage = lazy(() => import('../features/admin/admin-metric-page'));

const ForbiddenPage = lazy(() =>
  import('../features/errors/forbidden-page').then((m) => ({ default: m.ForbiddenPage })),
);
const NotFoundPage = lazy(() =>
  import('../features/errors/not-found-page').then((m) => ({ default: m.NotFoundPage })),
);

/**
 * Top-level router with lazy-loaded routes and authentication guards.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public & Guest Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<GuestGuard><LoginPage /></GuestGuard>} />
          <Route path="/register" element={<GuestGuard><RegisterPage /></GuestGuard>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Global Authenticated Shell Routes */}
          <Route element={<AuthGuard><AppShell /></AuthGuard>}>
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/feed/posts/:postId" element={<PostDetailPage />} />
            <Route path="/workspaces" element={<WorkspaceListPage />} />
            <Route path="/workspaces/:workspaceId/detail" element={<WorkspaceDetailPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>

          {/* Workspace Scoped Shell Routes */}
          <Route element={<AuthGuard><WorkspaceShell /></AuthGuard>}>
            <Route path="/workspaces/:workspaceId" element={<Navigate to="discussions" replace />} />
            <Route path="/workspaces/:workspaceId/overview" element={<WorkspaceOverviewPage />} />
            <Route path="/workspaces/:workspaceId/documents" element={<DocumentPage />} />
            <Route path="/workspaces/:workspaceId/chat" element={<ChatPage />} />
            <Route path="/workspaces/:workspaceId/conversations" element={<ConversationListPage />} />
            <Route path="/workspaces/:workspaceId/conversations/:conversationId" element={<ConversationPage />} />
            <Route path="/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
            <Route path="/workspaces/:workspaceId/evaluation" element={<EvaluationPage />} />
            <Route path="/workspaces/:workspaceId/discussions" element={<DiscussionPage />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<AuthGuard><AdminGuard><AppShell /></AdminGuard></AuthGuard>}>
            <Route path="/admin/users" element={<AdminUserPage />} />
            <Route path="/admin/metrics" element={<AdminMetricPage />} />
          </Route>

          {/* Error & Catch-all Routes */}
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

import { LoadingScreen } from '../components/loading-screen';

/** Simple centered loading indicator. */
function PageLoader() {
  return <LoadingScreen message="Đang kết nối giao diện..." />;
}
