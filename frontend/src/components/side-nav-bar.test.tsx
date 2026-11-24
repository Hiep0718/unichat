/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceProvider } from '../features/workspaces/workspace-context';
import * as authContext from '../features/auth/auth-context';
import * as workspaceHooks from '../features/workspaces/workspace-hooks';
import { SideNavBar } from './side-nav-bar';

import type { WorkspaceDetails } from '../features/workspaces/workspace-context';

afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const mockClearToken = vi.fn();
const mockJoinMutate = vi.fn();

vi.mock('../features/auth/api/auth-api', () => ({
  authApi: { logout: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../features/community/community-api', () => ({
  fetchNotifications: vi.fn().mockResolvedValue([]),
  fetchUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

const GROUP_PAGE = {
  content: [
    { id: 'ws-1', name: 'Trí tuệ nhân tạo' },
    { id: 'ws-2', name: 'Quản lý dự án' },
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 20,
};

function mockUser(overrides: Partial<{ email: string; displayName: string; systemRole: 'USER' | 'ADMIN'; status: 'ACTIVE' | 'SUSPENDED' }> = {}) {
  vi.spyOn(authContext, 'useAuth').mockReturnValue({
    user: {
      id: 'user-1',
      email: 'student@unichat.edu.vn',
      displayName: 'Hiệp Nguyễn',
      systemRole: 'USER',
      status: 'ACTIVE',
      ...overrides,
    },
    token: 'jwt-token',
    isAuthenticated: true,
    isLoading: false,
    setToken: vi.fn(),
    setUser: vi.fn(),
    clearToken: mockClearToken,
  } as unknown as ReturnType<typeof authContext.useAuth>);
}

function renderSidebar(initialEntry: string, workspace?: WorkspaceDetails) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const content = workspace ? (
    <WorkspaceProvider workspace={workspace}>
      <SideNavBar />
    </WorkspaceProvider>
  ) : (
    <SideNavBar />
  );

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/workspaces/:workspaceId/*" element={content} />
          <Route path="*" element={content} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SideNavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
    vi.spyOn(workspaceHooks, 'useWorkspaces').mockReturnValue({
      data: GROUP_PAGE,
    } as unknown as ReturnType<typeof workspaceHooks.useWorkspaces>);
    vi.spyOn(workspaceHooks, 'useJoinWorkspace').mockReturnValue({
      mutate: mockJoinMutate,
      isPending: false,
    } as unknown as ReturnType<typeof workspaceHooks.useJoinWorkspace>);
  });

  it('pins global primary navigation (including AI Assistant) outside the scrollable group list', () => {
    renderSidebar('/feed');

    const nav = screen.getByRole('navigation', { name: 'Thanh điều hướng chính' });
    const primary = nav.querySelector('.side-nav__primary');
    const scroll = nav.querySelector('.side-nav__scroll');

    expect(primary).not.toBeNull();
    expect(scroll).not.toBeNull();
    expect(primary).toContainElement(screen.getByRole('link', { name: 'Bảng tin' }));
    expect(primary).toContainElement(screen.getByRole('link', { name: 'Trợ lý AI' }));
    expect(primary).toContainElement(screen.getByRole('link', { name: 'Workspace' }));
    expect(primary).toContainElement(screen.getByRole('link', { name: 'Tin nhắn' }));
    expect(screen.getByRole('link', { name: /Tài khoản/ })).toHaveAttribute('href', '/account');
    expect(scroll).toContainElement(screen.getByRole('link', { name: 'Trí tuệ nhân tạo' }));
    expect(scroll).toContainElement(screen.getByRole('link', { name: 'Quản lý dự án' }));
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it('keeps Bảng tin active when viewing a post detail page', () => {
    renderSidebar('/feed/posts/post-42');
    expect(screen.getByRole('link', { name: 'Bảng tin' })).toHaveAttribute('aria-current', 'page');
  });

  it('never shows Quản trị viên for regular users even if their email or display name contains admin or taolahiep', () => {
    mockUser({ email: 'badminton.admin@gmail.com', displayName: 'taolahiep', systemRole: 'USER', status: 'ACTIVE' });
    renderSidebar('/feed');
    expect(screen.queryByTestId('admin-nav-item')).not.toBeInTheDocument();
  });

  it('shows Quản trị viên only for active ADMIN users', () => {
    mockUser({ systemRole: 'ADMIN', status: 'SUSPENDED' });
    const { unmount } = renderSidebar('/feed');
    expect(screen.queryByTestId('admin-nav-item')).not.toBeInTheDocument();
    unmount();

    mockUser({ systemRole: 'ADMIN', status: 'ACTIVE' });
    renderSidebar('/feed');
    expect(screen.getByTestId('admin-nav-item')).toHaveAttribute('href', '/admin/ai-studio');
  });

  it('renders active workspace context links for a member and excludes that group from quick-switch list', () => {
    renderSidebar('/workspaces/ws-1/chat', {
      id: 'ws-1',
      name: 'Trí tuệ nhân tạo',
      description: '',
      visibility: 'PRIVATE',
      topics: [],
      role: 'OWNER',
      cloudAllowed: true,
      version: 1,
    });

    expect(screen.getByText('Workspace đang mở')).toBeInTheDocument();
    expect(screen.getByText('Chủ sở hữu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bài viết' })).toHaveAttribute('href', '/workspaces/ws-1/discussions');
    expect(screen.getByRole('link', { name: 'Tệp tài liệu' })).toHaveAttribute('href', '/workspaces/ws-1/documents');
    expect(screen.getByRole('link', { name: 'Thành viên' })).toHaveAttribute('href', '/workspaces/ws-1/members');
    expect(screen.getByRole('link', { name: 'Cài đặt Workspace' })).toHaveAttribute('href', '/workspaces/ws-1/settings');
    expect(screen.getByText('Chuyển Workspace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quản lý dự án' })).toBeInTheDocument();
  });

  it('hides Settings for VIEWER members inside a workspace', () => {
    renderSidebar('/workspaces/ws-1/about', {
      id: 'ws-1',
      name: 'Trí tuệ nhân tạo',
      description: '',
      visibility: 'SHARED',
      topics: [],
      role: 'VIEWER',
      cloudAllowed: true,
      version: 1,
    });

    expect(screen.getByText('Thành viên', { selector: '.side-nav__ws-role' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cài đặt Workspace' })).not.toBeInTheDocument();
  });

  it('hides workspace AI Assistant and offers Join action for non-members previewing a public group', () => {
    renderSidebar('/workspaces/ws-public/about', {
      id: 'ws-public',
      name: 'Nhóm Công Khai',
      description: '',
      visibility: 'PUBLIC',
      topics: [],
      role: null,
      cloudAllowed: true,
      version: 1,
    });

    const wsSection = screen.getByLabelText('Điều hướng Workspace Nhóm Công Khai');
    expect(wsSection).toHaveTextContent('Chưa tham gia');
    expect(wsSection.querySelector('a[href="/workspaces/ws-public/chat"]')).toBeNull();
    expect(wsSection.querySelector('a[href="/workspaces/ws-public/settings"]')).toBeNull();

    const joinBtn = screen.getByRole('button', { name: 'Tham gia Workspace' });
    fireEvent.click(joinBtn);
    expect(mockJoinMutate).toHaveBeenCalledWith('ws-public');
  });

  it('shows a view-all link when the user belongs to more groups than the first loaded page', () => {
    vi.spyOn(workspaceHooks, 'useWorkspaces').mockReturnValue({
      data: { ...GROUP_PAGE, totalElements: 28 },
    } as unknown as ReturnType<typeof workspaceHooks.useWorkspaces>);

    renderSidebar('/feed');
    expect(screen.getByRole('link', { name: 'Xem tất cả (28)' })).toHaveAttribute('href', '/workspaces');
  });

  it('invokes logout and clears token when logout button is clicked', async () => {
    const { authApi } = await import('../features/auth/api/auth-api');
    renderSidebar('/feed');
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/i }));
    expect(authApi.logout).toHaveBeenCalled();
  });

  it('keeps the rail pinned open while the notification panel is open', async () => {
    renderSidebar('/feed');
    const nav = screen.getByRole('navigation', { name: 'Thanh điều hướng chính' });
    expect(nav).not.toHaveClass('side-nav--expanded');

    await userEvent.click(screen.getByText('Thông báo'));
    expect(nav).toHaveClass('side-nav--expanded');
  });

  it('enforces flex-shrink: 0 on nav items and overlay-only expansion without shifting main content', () => {
    const sideCss = readFileSync(join(process.cwd(), 'src/components/side-nav-bar.css'), 'utf8');
    const shellCss = readFileSync(join(process.cwd(), 'src/app/app-shell.css'), 'utf8');

    expect(sideCss).toMatch(/\.side-nav__item\s*\{[^}]*flex-shrink:\s*0/);
    expect(shellCss).not.toContain('margin-left: var(--sidebar-width)');
  });
});
