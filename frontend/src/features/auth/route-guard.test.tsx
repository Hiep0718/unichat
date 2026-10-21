import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GuestGuard } from './route-guard';

const authState = vi.hoisted(() => ({ isAuthenticated: false, isLoading: true }));
vi.mock('./auth-context', () => ({ useAuth: () => authState }));

describe('GuestGuard', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.isLoading = true;
  });

  it('should show branded session verification while authentication is loading', () => {
    render(<MemoryRouter><GuestGuard><div>Form đăng nhập</div></GuestGuard></MemoryRouter>);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('heading', { name: 'UniChat AI Platform' })).toBeInTheDocument();
    expect(screen.getByText('Đang xác minh phiên đăng nhập…')).toBeInTheDocument();
    expect(screen.queryByText('Form đăng nhập')).not.toBeInTheDocument();
  });
});
