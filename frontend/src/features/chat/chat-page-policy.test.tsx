import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ChatPage } from './chat-page';
import { WorkspaceProvider } from '../workspaces/workspace-context';

import * as chatSessionHook from './use-chat-session';
import * as conversationApi from '../history/conversation-api';

vi.mock('./components/chat-header', () => ({
  ChatHeader: () => <header data-testid="chat-header" />,
}));
vi.mock('./components/chat-welcome', () => ({ ChatWelcome: () => null }));
vi.mock('./components/chat-message-item', () => ({
  ChatMessageItem: ({ message }: { message: { id: string; content: string } }) => (
    <article data-testid={`msg-${message.id}`}>{message.content}</article>
  ),
}));
vi.mock('./components/chat-input-form', () => ({ ChatInputForm: () => null }));
vi.mock('./components/chat-studio-panels', () => ({ ChatStudioPanels: () => null }));
vi.mock('./use-chat-session', () => ({
  useChatSession: vi.fn(() => ({
    title: undefined,
    messageCount: 0,
    messages: [],
    conversationId: undefined,
    initialLoading: false,
    older: false,
    error: null,
    canRetry: false,
    loadOlder: vi.fn(),
    retry: vi.fn(),
    send: vi.fn(),
    reset: vi.fn(),
    cancel: vi.fn(),
    loading: false,
  })),
}));
vi.mock('./use-chat-notes', () => ({
  useChatNotes: () => ({ error: null, save: vi.fn() }),
}));
vi.mock('../documents/document-api', () => ({
  fetchWorkspaceDocuments: vi.fn().mockResolvedValue({ content: [] }),
}));
vi.mock('../history/conversation-api', () => ({
  fetchWorkspaceConversations: vi.fn().mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 }),
  deleteWorkspaceConversation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../community/components/create-post-modal', () => ({ CreatePostModal: () => null }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-probe">{`${location.pathname}${location.search}`}</output>;
}

afterEach(cleanup);

describe('ChatPage policy banner', () => {
  it('should keep the disabled-AI notice outside the scrollable message section', () => {
    render(
      <WorkspaceProvider
        workspace={{
          id: 'workspace-1',
          name: 'Workspace riêng tư',
          description: '',
          visibility: 'PRIVATE',
          role: 'OWNER',
          cloudAllowed: false,
          topics: [],
          version: 1,
        }}
      >
        <MemoryRouter initialEntries={['/workspaces/workspace-1/chat']}>
          <Routes>
            <Route path="/workspaces/:workspaceId/chat" element={<ChatPage />} />
          </Routes>
        </MemoryRouter>
      </WorkspaceProvider>
    );

    const notice = screen.getByRole('alert');
    const banner = notice.parentElement;

    expect(banner).toHaveClass('chat-page__policy-banner');
    expect(notice.closest('.chat-page__messages-body')).toBeNull();
    expect(banner?.nextElementSibling).toHaveClass('chat-page__messages-body');
  });

  it('should render a recoverable request error at the bottom of the message stream below the failed question', () => {
    vi.mocked(chatSessionHook.useChatSession).mockReturnValueOnce({
      title: 'MongoDB',
      messages: [
        { id: 'u-1', role: 'USER', content: 'So sánh SQL và NoSQL' },
        { id: 'a-1', role: 'ASSISTANT', content: 'SQL dùng bảng...' },
        { id: 'u-2', role: 'USER', content: 'Sharding là gì' },
      ],
      conversationId: 'conv-1',
      initialLoading: false,
      older: false,
      error: 'Dịch vụ AI phản hồi quá chậm. Vui lòng thử lại.',
      canRetry: true,
      loadOlder: vi.fn(),
      retry: vi.fn(),
      send: vi.fn(),
      reset: vi.fn(),
      cancel: vi.fn(),
      loading: false,
    });

    render(
      <WorkspaceProvider
        workspace={{
          id: 'workspace-1',
          name: 'MongoDB Basic',
          description: '',
          visibility: 'PRIVATE',
          role: 'OWNER',
          cloudAllowed: true,
          topics: [],
          version: 1,
        }}
      >
        <MemoryRouter initialEntries={['/workspaces/workspace-1/chat']}>
          <Routes>
            <Route path="/workspaces/:workspaceId/chat" element={<ChatPage />} />
          </Routes>
        </MemoryRouter>
      </WorkspaceProvider>,
    );

    const lastQuestion = screen.getByTestId('msg-u-2');
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Dịch vụ AI phản hồi quá chậm. Vui lòng thử lại.');
    // The error alert must follow the last user message in document order, not sit above turn #1.
    expect(lastQuestion.compareDocumentPosition(errorAlert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should open workspace conversation history from the floating bubble and navigate to the selected thread', async () => {
    vi.mocked(conversationApi.fetchWorkspaceConversations).mockResolvedValueOnce({
      content: [
        {
          id: 'conv-42',
          workspaceId: 'workspace-1',
          userId: 'user-1',
          title: 'Phân tích Indexing MongoDB',
          status: 'ACTIVE',
          createdAt: '2026-11-24T10:00:00+07:00',
          updatedAt: '2026-11-24T10:15:00+07:00',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    });

    render(
      <WorkspaceProvider
        workspace={{
          id: 'workspace-1',
          name: 'MongoDB Basic',
          description: '',
          visibility: 'PRIVATE',
          role: 'OWNER',
          cloudAllowed: true,
          topics: [],
          version: 1,
        }}
      >
        <MemoryRouter initialEntries={['/workspaces/workspace-1/chat']}>
          <Routes>
            <Route path="/workspaces/:workspaceId/chat" element={<><ChatPage /><LocationProbe /></>} />
          </Routes>
        </MemoryRouter>
      </WorkspaceProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lịch sử cuộc trò chuyện trong Workspace' }));
    const item = await screen.findByRole('button', { name: /^Phân tích Indexing MongoDB/ });
    fireEvent.click(item);

    expect(screen.getByTestId('location-probe')).toHaveTextContent('/workspaces/workspace-1/chat?conversationId=conv-42');
  });
});
