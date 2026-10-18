import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvitePage } from './invite-page';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

vi.mock('./invite-api', () => ({
  previewInvite: vi.fn(),
  acceptInvite: vi.fn(),
  inviteUrlFor: (token: string) => `https://app.test/invite/${token}`,
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

const { previewInvite } = await import('./invite-api');
const { useAuth } = await import('../auth/auth-context');

const TOKEN = 'abc123';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}`]}>
      <Routes>
        <Route path="/invite/:token" element={<InvitePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function givenSignedIn(isAuthenticated: boolean) {
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated, isLoading: false } as ReturnType<
    typeof useAuth
  >);
}

describe('InvitePage', () => {
  beforeEach(() => {
    navigate.mockClear();
    vi.mocked(previewInvite).mockResolvedValue({
      workspaceId: 'ws-1',
      workspaceName: 'Khoa học dữ liệu',
      invitedByName: 'Minh',
      role: 'VIEWER',
    });
  });

  it('should say what the group is and who invited you before you sign in', async () => {
    // The whole reason this page is public: a login screen gives a stranger
    // no reason to trust the link enough to register.
    givenSignedIn(false);
    renderPage();

    expect(await screen.findByText('Khoa học dữ liệu')).toBeInTheDocument();
    expect(screen.getByText(/Minh mời bạn tham gia/)).toBeInTheDocument();
  });

  it('should carry the invitation through login and through register', async () => {
    givenSignedIn(false);
    renderPage();

    expect(await screen.findByRole('link', { name: /Đăng nhập để tham gia/ })).toHaveAttribute(
      'href',
      `/login?redirect=%2Finvite%2F${TOKEN}`,
    );
    expect(screen.getByRole('link', { name: /Đăng ký/ })).toHaveAttribute(
      'href',
      `/register?redirect=%2Finvite%2F${TOKEN}`,
    );
  });

  it('should offer to join outright when already signed in', async () => {
    givenSignedIn(true);
    renderPage();

    expect(await screen.findByRole('button', { name: 'Tham gia nhóm' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Đăng nhập/ })).not.toBeInTheDocument();
  });

  it('should open the workspace when the caller is already a member', async () => {
    const user = userEvent.setup();
    givenSignedIn(true);
    const { acceptInvite } = await import('./invite-api');
    const { ApiError } = await import('../../lib/api-client');
    vi.mocked(acceptInvite).mockRejectedValue(
      new ApiError(409, 'Bạn đã là thành viên của workspace này'),
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Tham gia nhóm' }));

    // Anyone testing their own link lands here; refusing to move made the
    // button look broken.
    expect(navigate).toHaveBeenCalledWith('/workspaces/ws-1', { replace: true });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should explain a dead link instead of showing an empty page', async () => {
    givenSignedIn(false);
    vi.mocked(previewInvite).mockRejectedValue(
      new Error('Link mời không hợp lệ hoặc đã hết hạn'),
    );
    renderPage();

    expect(await screen.findByText('Lời mời không dùng được')).toBeInTheDocument();
    expect(screen.getByText(/hết hạn, đã dùng hết lượt, hoặc bị chủ nhóm thu hồi/)).toBeInTheDocument();
  });
});
