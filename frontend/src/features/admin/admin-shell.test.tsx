import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminShell } from './admin-shell';

vi.mock('../auth/auth-context', () => ({
  useAuth: () => ({
    user: { email: 'admin@unichat.test', systemRole: 'ADMIN' },
    isAuthenticated: true,
  }),
}));

describe('AdminShell', () => {
  it('renders all admin navigation tabs and portal header', () => {
    render(
      <BrowserRouter>
        <AdminShell />
      </BrowserRouter>
    );

    expect(screen.getByText('UniChat Admin Portal')).toBeInTheDocument();
    expect(screen.getByText('Giám sát Gemini API')).toBeInTheDocument();
    expect(screen.getByText('Người dùng & Phân quyền')).toBeInTheDocument();
    expect(screen.getByText('Số liệu đăng nhập & Chat AI')).toBeInTheDocument();
    expect(screen.queryByText('Không gian làm việc')).not.toBeInTheDocument();
    expect(screen.getByText('Nhật ký Kiểm toán')).toBeInTheDocument();
    expect(screen.getByText('Về ứng dụng')).toBeInTheDocument();
  });
});
