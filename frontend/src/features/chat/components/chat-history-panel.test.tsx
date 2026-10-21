import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatHistoryPanel } from './chat-history-panel';

const fetchWorkspaceConversations = vi.fn();

vi.mock('../../history/conversation-api', () => ({
  fetchWorkspaceConversations: (...args: unknown[]) => fetchWorkspaceConversations(...args),
}));

const conversation = (id: string, title: string) => ({
  id,
  workspaceId: 'ws-1',
  userId: 'u-1',
  title,
  status: 'ACTIVE',
  createdAt: '2026-10-19T08:00:00Z',
  updatedAt: '2026-10-19T08:00:00Z',
});

function renderPanel(overrides: Partial<Parameters<typeof ChatHistoryPanel>[0]> = {}) {
  const props = {
    workspaceId: 'ws-1',
    currentId: null,
    onOpen: vi.fn(),
    onNew: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<ChatHistoryPanel {...props} />);
  return props;
}

describe('ChatHistoryPanel', () => {
  beforeEach(() => {
    fetchWorkspaceConversations.mockReset();
    fetchWorkspaceConversations.mockResolvedValue({
      content: [conversation('c-1', 'So sánh MongoDB với Postgres'), conversation('c-2', 'Đề thi cuối kỳ')],
    });
  });

  it('should list the conversations this assistant already holds', async () => {
    renderPanel();

    expect(await screen.findByText('So sánh MongoDB với Postgres')).toBeInTheDocument();
    expect(screen.getByText('Đề thi cuối kỳ')).toBeInTheDocument();
  });

  it('should hand back the id of the conversation that was picked', async () => {
    const props = renderPanel();

    await userEvent.click(await screen.findByText('Đề thi cuối kỳ'));

    expect(props.onOpen).toHaveBeenCalledWith('c-2');
  });

  it('should mark the conversation currently on screen', async () => {
    renderPanel({ currentId: 'c-1' });

    const current = (await screen.findByText('So sánh MongoDB với Postgres')).closest('button');
    const other = screen.getByText('Đề thi cuối kỳ').closest('button');

    expect(current).toHaveAttribute('aria-current', 'true');
    expect(other).not.toHaveAttribute('aria-current');
  });

  it('should say so rather than look empty when the list cannot be read', async () => {
    fetchWorkspaceConversations.mockRejectedValue(new Error('offline'));

    renderPanel();

    expect(await screen.findByText('Không tải được lịch sử.')).toBeInTheDocument();
  });

  it('should distinguish an empty history from a failed one', async () => {
    fetchWorkspaceConversations.mockResolvedValue({ content: [] });

    renderPanel();

    await waitFor(() =>
      expect(screen.getByText('Chưa có cuộc trò chuyện nào.')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Không tải được lịch sử.')).not.toBeInTheDocument();
  });

  it('should offer to start a new conversation without leaving the panel', async () => {
    const props = renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /Cuộc trò chuyện mới/ }));

    expect(props.onNew).toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
