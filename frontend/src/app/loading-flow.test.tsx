import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { lazy, Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadingProvider } from '../components/loading-provider';
import { LoadingScreen } from '../components/loading-screen';
import { AuthGuard, GuestGuard } from '../features/auth/route-guard';
import { WorkspaceShell } from './workspace-shell';

const authState = vi.hoisted(() => ({ isAuthenticated: false, isLoading: true }));
const fetchWorkspace = vi.hoisted(() => vi.fn());
vi.mock('../features/auth/auth-context', () => ({ useAuth: () => authState }));
vi.mock('../features/workspaces/workspace-api', () => ({
  fetchWorkspace,
  getWorkspace: fetchWorkspace,
}));
vi.mock('./app-shell', async () => {
  const { Outlet } = await import('react-router-dom');
  return { AppShell: () => <div>Nội dung Workspace<Outlet /></div> };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function TestProviders({ children }: { readonly children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>{children}</LoadingProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);
beforeEach(() => {
  authState.isAuthenticated = false;
  authState.isLoading = true;
  fetchWorkspace.mockReset();
  queryClient.clear();
  localStorage.clear();
});

describe('LoadingFlow', () => {
  it('should preserve the indicator when workspace metadata completes before its nested lazy page', async () => {
    authState.isLoading = false;
    authState.isAuthenticated = true;
    const workspaceGate = Promise.withResolvers<unknown>();
    const pageGate = Promise.withResolvers<{ default: () => React.ReactNode }>();
    const LazyPage = lazy(() => pageGate.promise);
    fetchWorkspace.mockReturnValue(workspaceGate.promise);
    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/workspaces/demo/chat']}>
          <Suspense fallback={<LoadingScreen message="Đang kết nối giao diện..." />}>
            <Routes>
              <Route path="/workspaces/:workspaceId" element={<AuthGuard><WorkspaceShell /></AuthGuard>}>
                <Route path="chat" element={<LazyPage />} />
              </Route>
            </Routes>
          </Suspense>
        </MemoryRouter>
      </TestProviders>,
    );
    const indicator = screen.getByRole('status');

    await act(async () => {
      workspaceGate.resolve({ id: 'demo', name: 'Nhóm học tập', visibility: 'PRIVATE', userRole: 'OWNER' });
    });

    expect(screen.getByRole('status')).toBe(indicator);
    await waitFor(() => {
      expect(screen.getByText('Đang kết nối giao diện...')).toBeInTheDocument();
    });

    await act(async () => { pageGate.resolve({ default: () => <div>Trang trò chuyện</div> }); });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Trang trò chuyện')).toBeInTheDocument();
  });

  it('should preserve the indicator when a restored session redirects to a lazy destination', async () => {
    const pageGate = Promise.withResolvers<{ default: () => React.ReactNode }>();
    const LazyDestination = lazy(() => pageGate.promise);
    const createTree = () => (
      <TestProviders>
        <MemoryRouter initialEntries={['/login']}>
          <Suspense fallback={<LoadingScreen message="Đang kết nối giao diện..." />}>
            <Routes>
              <Route path="/login" element={<GuestGuard><div>Form đăng nhập</div></GuestGuard>} />
              <Route path="/workspaces" element={<AuthGuard><LazyDestination /></AuthGuard>} />
            </Routes>
          </Suspense>
        </MemoryRouter>
      </TestProviders>
    );
    const { rerender } = render(createTree());
    const indicator = screen.getByRole('status');

    authState.isLoading = false;
    authState.isAuthenticated = true;
    rerender(createTree());

    expect(screen.getByRole('status')).toBe(indicator);
    expect(screen.queryByText('Form đăng nhập')).not.toBeInTheDocument();

    await act(async () => { pageGate.resolve({ default: () => <div>Danh sách Workspace</div> }); });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Danh sách Workspace')).toBeInTheDocument();
  });

  it('should keep one indicator through authentication, lazy route and workspace loading', async () => {
    const pageGate = Promise.withResolvers<{ default: typeof WorkspaceShell }>();
    const workspaceGate = Promise.withResolvers<unknown>();
    const LazyWorkspace = lazy(() => pageGate.promise);
    fetchWorkspace.mockReturnValue(workspaceGate.promise);
    const createTree = () => (
      <TestProviders>
        <MemoryRouter initialEntries={['/workspaces/demo/chat']}>
          <Suspense fallback={<LoadingScreen message="Đang kết nối giao diện..." />}>
            <Routes>
              <Route path="/workspaces/:workspaceId/chat" element={<AuthGuard><LazyWorkspace /></AuthGuard>} />
            </Routes>
          </Suspense>
        </MemoryRouter>
      </TestProviders>
    );
    const { rerender } = render(createTree());
    const indicator = screen.getByRole('status');
    const emblem = indicator.querySelector('img');
    expect(fetchWorkspace).not.toHaveBeenCalled();

    authState.isLoading = false;
    authState.isAuthenticated = true;
    rerender(createTree());

    expect(screen.getByRole('status')).toBe(indicator);
    expect(screen.getByText('Đang kết nối giao diện...')).toBeInTheDocument();

    await act(async () => { pageGate.resolve({ default: WorkspaceShell }); });

    expect(screen.getByRole('status')).toBe(indicator);
    expect(indicator.querySelector('img')).toBe(emblem);
    expect(screen.getByText('Đang tải thông tin Workspace...')).toBeInTheDocument();
    expect(fetchWorkspace).toHaveBeenCalledWith('demo');

    await act(async () => {
      workspaceGate.resolve({ id: 'demo', name: 'Nhóm học tập', visibility: 'PRIVATE', userRole: 'OWNER' });
    });

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Nội dung Workspace')).toBeInTheDocument();
  });

  it('should release the loading screen when workspace loading fails', async () => {
    authState.isLoading = false;
    authState.isAuthenticated = true;
    const workspaceGate = Promise.withResolvers<unknown>();
    fetchWorkspace.mockReturnValue(workspaceGate.promise);
    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/workspaces/demo/chat']}>
          <Routes>
            <Route path="/workspaces/:workspaceId/chat" element={<AuthGuard><WorkspaceShell /></AuthGuard>} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(async () => { workspaceGate.reject(new Error('Không thể tải Workspace')); });

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Không thể tải thông tin Workspace' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quay lại danh sách Workspace' })).toBeInTheDocument();
  });

  it('should release the loading screen and redirect after session restoration fails', () => {
    const createTree = () => (
      <TestProviders>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/protected" element={<AuthGuard><div>Nội dung riêng tư</div></AuthGuard>} />
            <Route path="/login" element={<div>Form đăng nhập</div>} />
          </Routes>
        </MemoryRouter>
      </TestProviders>
    );
    const { rerender } = render(createTree());

    authState.isLoading = false;
    rerender(createTree());

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Nội dung riêng tư')).not.toBeInTheDocument();
    expect(screen.getByText('Form đăng nhập')).toBeInTheDocument();
    expect(fetchWorkspace).not.toHaveBeenCalled();
  });
});
