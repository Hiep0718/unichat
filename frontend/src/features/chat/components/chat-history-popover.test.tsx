import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteWorkspaceConversation,
  fetchWorkspaceConversations,
} from '../../history/conversation-api';
import {
  filterConversations,
  formatConversationTime,
  groupConversationsByDate,
} from './chat-history-helpers';
import { ChatHistoryPopover } from './chat-history-popover';
import type { ConversationItem } from '../../history/conversation-api';

vi.mock('../../history/conversation-api', () => ({
  fetchWorkspaceConversations: vi.fn(),
  deleteWorkspaceConversation: vi.fn(),
}));

const NOW = new Date('2026-11-24T15:00:00+07:00');

const SAMPLE_ITEMS: ConversationItem[] = [
  {
    id: 'conv-today',
    workspaceId: 'ws-1',
    userId: 'user-1',
    title: 'So sánh SQL và NoSQL',
    status: 'ACTIVE',
    createdAt: '2026-11-24T13:30:00+07:00',
    updatedAt: '2026-11-24T14:20:00+07:00',
  },
  {
    id: 'conv-yesterday',
    workspaceId: 'ws-1',
    userId: 'user-1',
    title: 'Sharding trong MongoDB',
    status: 'ACTIVE',
    createdAt: '2026-11-23T09:10:00+07:00',
    updatedAt: '2026-11-23T09:10:00+07:00',
  },
  {
    id: 'conv-old',
    workspaceId: 'ws-1',
    userId: 'user-1',
    title: 'Tổng quan Replica Set',
    status: 'ACTIVE',
    createdAt: '2026-11-01T08:00:00+07:00',
    updatedAt: '2026-11-01T08:00:00+07:00',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('chat-history-helpers', () => {
  it('should group conversations into chronological Vietnamese date buckets', () => {
    const groups = groupConversationsByDate(SAMPLE_ITEMS, NOW);
    expect(groups.map((g) => g.label)).toEqual(['Hôm nay', 'Hôm qua', 'Trước đó']);
    expect(groups[0]?.items[0]?.id).toBe('conv-today');
    expect(groups[1]?.items[0]?.id).toBe('conv-yesterday');
    expect(groups[2]?.items[0]?.id).toBe('conv-old');
  });

  it('should filter titles with Vietnamese accent-insensitive matching', () => {
    expect(filterConversations(SAMPLE_ITEMS, 'so sanh sql')).toHaveLength(1);
    expect(filterConversations(SAMPLE_ITEMS, 'tong quan')[0]?.id).toBe('conv-old');
    expect(filterConversations(SAMPLE_ITEMS, '   ')).toHaveLength(3);
  });

  it('should format compact timestamps for today, yesterday and older dates', () => {
    const todayIso = '2026-11-24T14:20:00+07:00';
    const expectedTodayTime = new Date(todayIso).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(formatConversationTime(todayIso, NOW)).toBe(expectedTodayTime);
    expect(formatConversationTime('2026-11-23T09:10:00+07:00', NOW)).toMatch(/^Hôm qua · \d{2}:\d{2}$/);
    expect(formatConversationTime('2026-11-01T08:00:00+07:00', NOW)).toBe('01/11');
  });
});

describe('ChatHistoryPopover', () => {
  it('should open compact history modal on bubble click, highlight active thread and reopen selected thread', async () => {
    vi.mocked(fetchWorkspaceConversations).mockResolvedValue({
      content: SAMPLE_ITEMS,
      totalElements: 3,
      totalPages: 1,
      number: 0,
      size: 20,
    });
    const onSelectConversation = vi.fn();
    const onNewChat = vi.fn();

    render(
      <MemoryRouter>
        <ChatHistoryPopover
          workspaceId="ws-1"
          workspaceName="MongoDB Basic"
          activeConversationId="conv-today"
          onSelectConversation={onSelectConversation}
          onNewChat={onNewChat}
        />
      </MemoryRouter>,
    );

    expect(fetchWorkspaceConversations).not.toHaveBeenCalled();
    const trigger = screen.getByRole('button', { name: 'Lịch sử cuộc trò chuyện trong Workspace' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(await screen.findByRole('dialog', { name: 'Lịch sử cuộc trò chuyện' })).toBeInTheDocument();
    expect(fetchWorkspaceConversations).toHaveBeenCalledWith('ws-1', 0, 20);
    expect(screen.getByText('MongoDB Basic')).toBeInTheDocument();
    expect(screen.getByText('Đang mở')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Sharding trong MongoDB/ }));

    expect(onSelectConversation).toHaveBeenCalledWith('conv-yesterday');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should debounce search, delete active conversation with inline confirm, and close on Escape', async () => {
    vi.mocked(fetchWorkspaceConversations).mockResolvedValue({
      content: SAMPLE_ITEMS,
      totalElements: 3,
      totalPages: 2,
      number: 0,
      size: 20,
    });
    vi.mocked(deleteWorkspaceConversation).mockResolvedValue(undefined);
    const onDeletedActive = vi.fn();

    render(
      <MemoryRouter>
        <ChatHistoryPopover
          workspaceId="ws-1"
          workspaceName="MongoDB Basic"
          activeConversationId="conv-today"
          onSelectConversation={vi.fn()}
          onNewChat={vi.fn()}
          onDeletedActive={onDeletedActive}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lịch sử cuộc trò chuyện trong Workspace' }));
    await screen.findByText('So sánh SQL và NoSQL');
    expect(screen.getByRole('button', { name: 'Xem thêm cuộc trò chuyện' })).toBeInTheDocument();

    // Debounced search filters conversations after 300ms
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText('Tìm cuộc trò chuyện trong Workspace'), {
      target: { value: 'so sanh' },
    });
    act(() => {
      vi.advanceTimersByTime(310);
    });
    vi.useRealTimers();

    expect(screen.getByText('So sánh SQL và NoSQL')).toBeInTheDocument();
    expect(screen.queryByText('Sharding trong MongoDB')).not.toBeInTheDocument();

    // Inline delete confirmation without window.confirm
    fireEvent.click(screen.getByRole('button', { name: 'Xóa cuộc trò chuyện So sánh SQL và NoSQL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }));

    await waitFor(() => {
      expect(deleteWorkspaceConversation).toHaveBeenCalledWith('ws-1', 'conv-today');
      expect(onDeletedActive).toHaveBeenCalledOnce();
    });

    // Re-open and close via Escape
    fireEvent.click(screen.getByRole('button', { name: 'Lịch sử cuộc trò chuyện trong Workspace' }));
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render retryable error state when conversation loading fails', async () => {
    vi.mocked(fetchWorkspaceConversations)
      .mockRejectedValueOnce(new Error('Mất kết nối máy chủ'))
      .mockResolvedValueOnce({
        content: [SAMPLE_ITEMS[0]!],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      });

    render(
      <MemoryRouter>
        <ChatHistoryPopover
          workspaceId="ws-1"
          onSelectConversation={vi.fn()}
          onNewChat={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lịch sử cuộc trò chuyện trong Workspace' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối máy chủ');

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('So sánh SQL và NoSQL')).toBeInTheDocument();
  });
});

