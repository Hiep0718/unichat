import { cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../features/errors/error-boundary';
import { LoadingProvider } from './loading-provider';
import { LoadingInline, LoadingScreen } from './loading-screen';

afterEach(cleanup);

describe('LoadingProvider', () => {
  it('should preserve the indicator when loading ownership changes', () => {
    const { rerender } = render(
      <LoadingProvider><LoadingScreen key="session" message="Đang xác minh phiên đăng nhập…" /></LoadingProvider>,
    );
    const indicator = screen.getByRole('status');
    const emblem = indicator.querySelector('img');

    rerender(<LoadingProvider><LoadingScreen key="page" message="Đang kết nối giao diện..." /></LoadingProvider>);

    expect(screen.getByRole('status')).toBe(indicator);
    expect(indicator.querySelector('img')).toBe(emblem);
    expect(screen.getByText('Đang kết nối giao diện...')).toBeInTheDocument();
    expect(screen.queryByText('Đang xác minh phiên đăng nhập…')).not.toBeInTheDocument();
  });

  it('should remain visible until every overlapping request finishes', () => {
    const { rerender } = render(
      <LoadingProvider>
        <LoadingScreen key="session" message="Đang xác minh phiên đăng nhập…" />
        <LoadingScreen key="workspace" message="Đang tải thông tin Workspace..." />
      </LoadingProvider>,
    );
    const indicator = screen.getByRole('status');

    rerender(<LoadingProvider><LoadingScreen key="session" message="Đang xác minh phiên đăng nhập…" /></LoadingProvider>);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toBe(indicator);
    expect(screen.getByText('Đang xác minh phiên đăng nhập…')).toBeInTheDocument();

    rerender(<LoadingProvider><div>Nội dung đã sẵn sàng</div></LoadingProvider>);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Nội dung đã sẵn sàng')).toBeInTheDocument();
  });

  it('should update the current message without restarting the animation', () => {
    const { rerender } = render(<LoadingProvider><LoadingScreen message="Đang tải..." /></LoadingProvider>);
    const indicator = screen.getByRole('status');

    rerender(<LoadingProvider><LoadingScreen message="Đang kết nối..." brandTitle="UniChat" /></LoadingProvider>);

    expect(screen.getByRole('status')).toBe(indicator);
    expect(screen.getByRole('heading', { name: 'UniChat' })).toBeInTheDocument();
    expect(screen.getByText('Đang kết nối...')).toBeInTheDocument();
  });

  it('should release requests after StrictMode cleanup without leaving a stuck overlay', () => {
    const { rerender } = render(
      <StrictMode><LoadingProvider><LoadingScreen /></LoadingProvider></StrictMode>,
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);

    rerender(<StrictMode><LoadingProvider><div>Đã tải xong</div></LoadingProvider></StrictMode>);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('should keep container loading independent of the full-screen host', () => {
    render(<LoadingProvider><LoadingScreen fullScreen={false} message="Đang tải bảng..." /></LoadingProvider>);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).not.toHaveClass('loading-screen--fullscreen');
    expect(screen.getByText('Đang tải bảng...')).toBeInTheDocument();
  });

  it('should support standalone loading when a provider is absent', () => {
    render(<LoadingScreen />);

    expect(screen.getByRole('status')).toHaveClass('loading-screen--fullscreen');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('should prevent interaction with obscured content until loading completes', () => {
    const { rerender } = render(
      <LoadingProvider><button>Hành động</button><LoadingScreen /></LoadingProvider>,
    );
    const content = screen.getByText('Hành động').parentElement;
    expect(content).toHaveAttribute('inert');
    expect(content).toHaveAttribute('aria-hidden', 'true');

    rerender(<LoadingProvider><button>Hành động</button></LoadingProvider>);

    expect(content).not.toHaveAttribute('inert');
    expect(content).not.toHaveAttribute('aria-hidden');
    expect(screen.getByRole('button', { name: 'Hành động' })).toBeInTheDocument();
  });

  it('should preserve the inline spinner without creating a full-page overlay', () => {
    render(<LoadingProvider><LoadingInline label="Đang tải dữ liệu..." /></LoadingProvider>);

    expect(screen.getByRole('status')).toHaveClass('loading-inline');
    expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
    expect(document.querySelector('.loading-screen--fullscreen')).toHaveAttribute('aria-hidden', 'true');
  });

  it('should reveal the global error boundary when a route throws', () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function FailedRoute(): never { throw new Error('Route unavailable'); }
    const { rerender } = render(<ErrorBoundary><LoadingProvider><LoadingScreen /></LoadingProvider></ErrorBoundary>);
    expect(screen.getByRole('status')).toBeInTheDocument();

    try {
      rerender(<ErrorBoundary><LoadingProvider><FailedRoute /></LoadingProvider></ErrorBoundary>);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Đã xảy ra lỗi không mong muốn' })).toBeInTheDocument();
    } finally {
      errorLog.mockRestore();
    }
  });
});
