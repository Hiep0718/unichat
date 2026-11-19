import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SideNavBar } from './side-nav-bar';

afterEach(cleanup);

const mockClearToken = vi.fn();

vi.mock('../features/auth/api/auth-api', () => ({
  authApi: {
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../features/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'user@unichat.edu.vn', systemRole: 'USER' },
    clearToken: mockClearToken,
  }),
}));

vi.mock('../features/workspaces/workspace-hooks', () => ({
  useWorkspaces: () => ({
    data: {
      content: [
        { id: 'ws-1', name: 'ainhantao' },
        { id: 'ws-2', name: 'Quản lý dự án' },
      ],
    },
  }),
}));

vi.mock('../features/community/community-api', () => ({
  fetchNotifications: vi.fn().mockResolvedValue([]),
  fetchUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

vi.mock('../features/documents/document-hooks', () => ({
  usePendingApprovalCount: () => ({ data: { pendingCount: 0 } }),
}));

describe('SideNavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard global navigation items, notification with "Thông báo" label, and "Đăng xuất" button', () => {
    render(
      <MemoryRouter initialEntries={['/feed']}>
        <SideNavBar />
      </MemoryRouter>,
    );

    // Global items
    expect(screen.getByText('Bảng tin')).toBeInTheDocument();
    expect(screen.getByText('Tất cả nhóm')).toBeInTheDocument();
    expect(screen.getByText('Tin nhắn')).toBeInTheDocument();
    expect(screen.getByText('Tài khoản')).toBeInTheDocument();

    // Group items
    expect(screen.getByText('ainhantao')).toBeInTheDocument();
    expect(screen.getByText('Quản lý dự án')).toBeInTheDocument();

    // Notification item with text label
    expect(screen.getByText('Thông báo')).toBeInTheDocument();

    // Logout item with text label
    // Theo tên khả truy cập chứ không theo chữ hiện: nút đăng xuất giờ nằm
    // trong hàng người dùng và chỉ còn biểu tượng. Điều cần giữ là nó vẫn
    // gọi được tên, không phải nó vẫn in ra chữ.
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it('should keep the same sidebar inside a group, marking the group and its assistant', async () => {
    // Arrange
    const { Routes, Route } = await import('react-router-dom');

    // Act
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/chat']}>
        <Routes>
          <Route path="/workspaces/:workspaceId/*" element={<SideNavBar />} />
        </Routes>
      </MemoryRouter>,
    );

    // Assert: the global destinations stay, the open group is marked, and
    // its assistant sits beneath it.
    expect(screen.getByText('Bảng tin')).toBeInTheDocument();
    expect(screen.getByText('Tin nhắn')).toBeInTheDocument();
    expect(screen.getByText('Quản lý dự án')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ainhantao' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Quản lý dự án' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Trợ lý AI' })).toHaveAttribute('href', '/workspaces/ws-1/chat');
    expect(screen.queryByText('Tải tài liệu mới')).not.toBeInTheDocument();
    expect(screen.queryByText('Đổi nhóm')).not.toBeInTheDocument();
  });

  it('should show no group assistant outside a group', () => {
    // Act
    render(
      <MemoryRouter initialEntries={['/feed']}>
        <SideNavBar />
      </MemoryRouter>,
    );

    // Assert
    expect(screen.queryByRole('link', { name: 'Trợ lý AI' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ainhantao' })).toHaveAttribute('href', '/workspaces/ws-1');
  });

  it('should not repeat destinations the group tab bar already carries', async () => {
    // Files, posts and members live in the tabs on the group page. Listing
    // them here too gave each of them a second name — "Quản lý tài liệu"
    // beside a tab called "Tệp" — and two names for one place read as two
    // places. History moved inside the assistant, where it belongs.
    const { Routes, Route } = await import('react-router-dom');

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/chat']}>
        <Routes>
          <Route path="/workspaces/:workspaceId/*" element={<SideNavBar />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Quản lý tài liệu')).not.toBeInTheDocument();
    expect(screen.queryByText('Thảo luận')).not.toBeInTheDocument();
    expect(screen.queryByText('Lịch sử hội thoại')).not.toBeInTheDocument();
    expect(screen.queryByText('Trò chuyện')).not.toBeInTheDocument();
  });

  it('invokes logout and clears token when logout button is clicked', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const { authApi } = await import('../features/auth/api/auth-api');

    render(
      <MemoryRouter initialEntries={['/feed']}>
        <SideNavBar />
      </MemoryRouter>,
    );

    const logoutBtn = screen.getByRole('button', { name: /Đăng xuất/i });
    fireEvent.click(logoutBtn);

    expect(authApi.logout).toHaveBeenCalled();
  });

  it('renders Quản trị viên link when user is admin', async () => {
    const authContext = await import('../features/auth/auth-context');
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: { id: 'admin-1', email: 'taolahieptqn122@gmail.com', displayName: 'Taolahieptqn122', systemRole: 'ADMIN', status: 'ACTIVE' },
      token: 'jwt-token',
      isAuthenticated: true,
      setToken: vi.fn(),
      setUser: vi.fn(),
      clearToken: mockClearToken,
    });

    render(
      <MemoryRouter initialEntries={['/workspaces']}>
        <SideNavBar />
      </MemoryRouter>,
    );

    const adminLinks = screen.getAllByRole('link', { name: /Quản trị viên/i });
    expect(adminLinks).toHaveLength(1);
    expect(adminLinks[0]).toHaveAttribute('href', '/admin/ai-studio');
  });
  it('should open on hover alone, with no collapse button and no remembered state', () => {
    // Arrange: a state saved by the old collapse button must not shape the rail.
    window.localStorage.setItem('unichat.rail', 'collapsed');

    // Act
    render(
      <MemoryRouter initialEntries={['/feed']}>
        <SideNavBar />
      </MemoryRouter>,
    );

    // Assert
    const nav = screen.getByRole('navigation', { name: 'Thanh điều hướng chính' });
    expect(nav).not.toHaveClass('side-nav--collapsed');
    expect(screen.queryByRole('button', { name: /Thu gọn|Mở rộng thanh bên/ })).not.toBeInTheDocument();
    window.localStorage.removeItem('unichat.rail');
  });

  it('should stay open while the notification panel is open', async () => {
    // Arrange
    render(
      <MemoryRouter initialEntries={['/feed']}>
        <SideNavBar />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Thanh điều hướng chính' });
    expect(nav).not.toHaveClass('side-nav--expanded');

    // Act: moving onto the panel leaves the rail, which must not fold under it.
    await userEvent.click(screen.getByText('Thông báo'));

    // Assert
    expect(nav).toHaveClass('side-nav--expanded');
  });
});
