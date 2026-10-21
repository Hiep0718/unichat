import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatHeader } from './chat-header';

afterEach(cleanup);

describe('ChatHeader', () => {
  it('should present a neutral AI label while retaining conversation actions', () => {
    const onNewChat = vi.fn();
    const onToggleStudio = vi.fn();
    const onToggleDrawer = vi.fn();
    render(<MemoryRouter><ChatHeader workspaceId="workspace" workspaceName="MongoDB BASIC" messageCount={4}
      onNewChat={onNewChat} onToggleStudio={onToggleStudio} onToggleDrawer={onToggleDrawer} /></MemoryRouter>);
    expect(screen.getByText('Trợ lý AI')).toBeInTheDocument();
    expect(screen.queryByText(/Gemini/)).not.toBeInTheDocument();
    expect(screen.getByText('4 tin nhắn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quay lại trang nhóm' })).toHaveAttribute('href', '/workspaces/workspace');
    fireEvent.click(screen.getByRole('button', { name: /Hội thoại mới/ }));
    fireEvent.click(screen.getByRole('button', { name: /Studio/ }));
    fireEvent.click(screen.getByTitle('Đóng/Mở bảng tài liệu xem chi tiết'));
    expect(onNewChat).toHaveBeenCalledOnce();
    expect(onToggleStudio).toHaveBeenCalledOnce();
    expect(onToggleDrawer).toHaveBeenCalledOnce();
  });
});
