import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SettingsPage from './settings-page';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);

const PROFILE = {
  id: 'u-1',
  email: 'lan.nguyen@iuh.edu.vn',
  displayName: 'Lan Nguyễn',
  systemRole: 'USER',
  status: 'ACTIVE',
  hasAvatar: false,
  avatarColor: null,
};

vi.mock('../auth/api/auth-api', () => ({
  authApi: {
    getMe: vi.fn(async () => PROFILE),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    removeAvatar: vi.fn(),
    chooseAvatarColor: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../auth/auth-context', () => ({
  useAuth: () => ({ setUser: vi.fn(), clearToken: vi.fn() }),
}));

vi.mock('../../components/avatar-image-cache', () => ({
  loadAvatar: vi.fn(async () => null),
  forgetAvatar: vi.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <SettingsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  it('should open on the profile area and name the account in the banner', async () => {
    // Arrange, Act
    renderPage();

    // Assert
    expect(screen.getByRole('heading', { level: 1, name: 'Cài đặt tài khoản' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('@lan.nguyen · lan.nguyen@iuh.edu.vn')).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Hồ sơ' })).toBeInTheDocument();
  });

  it('should show one area at a time rather than stacking every area', async () => {
    // Arrange
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Hồ sơ' });

    // Assert — mỗi mục mở một khung riêng, nên hai khung kia chưa được dựng.
    expect(screen.queryByRole('heading', { level: 2, name: 'Bảo mật' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Giao diện' })).not.toBeInTheDocument();
  });

  it('should swap to the security area when its nav item is chosen', async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Hồ sơ' });

    // Act
    await user.click(screen.getByRole('button', { name: 'Bảo mật' }));

    // Assert
    expect(screen.getByRole('heading', { level: 2, name: 'Bảo mật' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Hồ sơ' })).not.toBeInTheDocument();
  });

  it('should keep the password form closed until it is asked for', async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Hồ sơ' });
    await user.click(screen.getByRole('button', { name: 'Bảo mật' }));

    // Assert
    expect(screen.queryByLabelText('Mật khẩu hiện tại')).not.toBeInTheDocument();

    // Act
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    // Assert
    expect(screen.getByLabelText('Mật khẩu hiện tại')).toBeInTheDocument();
  });

  it('should refuse a new password shorter than the server minimum', async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Hồ sơ' });
    await user.click(screen.getByRole('button', { name: 'Bảo mật' }));
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    // Act
    await user.type(screen.getByLabelText('Mật khẩu hiện tại'), 'cu-rat-dai-12');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'ngan');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'ngan');
    await user.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('từ 12 đến 128 ký tự');
  });

  it('should not invent a list of signed-in devices', async () => {
    // Arrange — bản trước viết cứng "MacBook Pro - Chrome" và "iPhone 13 - Safari"
    // ở "Hà Nội, Việt Nam". Không dòng nào hỏi máy chủ cả.
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Hồ sơ' });

    // Act
    await user.click(screen.getByRole('button', { name: 'Bảo mật' }));

    // Assert
    expect(screen.queryByText(/MacBook|iPhone|Hà Nội/)).not.toBeInTheDocument();
  });
});
