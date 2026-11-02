import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatSessionStatus } from './chat-session-status';

afterEach(cleanup);

describe('ChatSessionStatus', () => {
  it('should present a styled recoverable failure and invoke retry', () => {
    const retry = vi.fn();
    render(<ChatSessionStatus initialLoading={false} hasOlder={false}
      error="Vui lòng thử lại sau." canRetry onLoadOlder={vi.fn()} onRetry={retry} />);

    expect(screen.getByRole('alert')).toHaveClass('chat-session-status--error');
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra lại/ }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('should expose loading and older-message controls without an error', () => {
    const loadOlder = vi.fn();
    render(<ChatSessionStatus initialLoading hasOlder error={null}
      canRetry={false} onLoadOlder={loadOlder} onRetry={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải lịch sử hội thoại');
    fireEvent.click(screen.getByRole('button', { name: /Tải tin nhắn cũ hơn/ }));
    expect(loadOlder).toHaveBeenCalledOnce();
  });
});
