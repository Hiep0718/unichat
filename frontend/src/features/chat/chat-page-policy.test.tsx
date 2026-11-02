import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChatPage } from './chat-page';
import { WorkspaceProvider } from '../workspaces/workspace-context';

vi.mock('./components/chat-header', () => ({
  ChatHeader: () => <header data-testid="chat-header" />,
}));
vi.mock('./components/chat-welcome', () => ({ ChatWelcome: () => null }));
vi.mock('./components/chat-message-item', () => ({ ChatMessageItem: () => null }));
vi.mock('./components/chat-input-form', () => ({ ChatInputForm: () => null }));
vi.mock('./components/chat-session-status', () => ({ ChatSessionStatus: () => null }));
vi.mock('./components/chat-studio-panels', () => ({ ChatStudioPanels: () => null }));
vi.mock('./use-chat-session', () => ({
  useChatSession: () => ({
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
  }),
}));
vi.mock('./use-chat-notes', () => ({
  useChatNotes: () => ({ error: null, save: vi.fn() }),
}));
vi.mock('../documents/document-api', () => ({
  fetchWorkspaceDocuments: vi.fn().mockResolvedValue({ content: [] }),
}));
vi.mock('../community/components/create-post-modal', () => ({ CreatePostModal: () => null }));

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
});
