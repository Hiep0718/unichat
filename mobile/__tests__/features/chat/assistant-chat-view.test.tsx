import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';

import { AssistantChatView } from '../../../src/features/chat/components/assistant-chat-view';
import { useChatStream } from '../../../src/features/chat/use-chat-stream';
import { workspaceApi } from '../../../src/features/workspaces/workspace-api';

jest.mock('../../../src/features/chat/use-chat-stream', () => ({ useChatStream: jest.fn() }));
jest.mock('../../../src/features/chat/chat-api', () => ({ chatApi: { getConversations: jest.fn() } }));
jest.mock('../../../src/features/workspaces/workspace-api', () => ({
  workspaceApi: { getWorkspaces: jest.fn(), getWorkspaceDocuments: jest.fn() },
}));
jest.mock('../../../src/features/auth/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
jest.mock('@ronradtke/react-native-markdown-display', () => {
  const { Text } = require('react-native');
  return ({ children }: { children: string }) => <Text>{children}</Text>;
});

const WS = { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Mongodb', visibility: 'PRIVATE', documentCount: 6, memberCount: 3 };
const OTHER = { id: '223e4567-e89b-12d3-a456-426614174000', name: 'AI', visibility: 'PRIVATE', documentCount: 2, memberCount: 3 };
const doc = (id: string, status: string) => ({ id, name: `${id}.pdf`, mimeType: 'application/pdf', fileSizeBytes: 1, status, createdAt: '' });

const sendMessage = jest.fn();

function stream(overrides: Record<string, unknown> = {}) {
  return {
    messages: [], isStreaming: false, isThinking: false, thoughtSteps: [], streamingAnswer: '',
    error: null, loadingHistory: false, sendMessage, ...overrides,
  };
}

function renderView(props: { conversationId?: string; initialQuestion?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AssistantChatView workspaceId={WS.id} {...props} />
    </QueryClientProvider>,
  );
}

describe('AssistantChatView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useChatStream).mockReturnValue(stream() as never);
    jest.mocked(workspaceApi.getWorkspaces).mockResolvedValue({ content: [WS, OTHER] } as never);
    jest.mocked(workspaceApi.getWorkspaceDocuments).mockResolvedValue({
      content: [doc('a', 'PROCESSED'), doc('b', 'PROCESSED'), doc('c', 'PROCESSING')],
    } as never);
  });

  it('greets a new chat with the group, readiness and document-based suggestions', async () => {
    const screen = await renderView();

    expect(await screen.findByText('Hỏi kho tri thức Mongodb')).toBeTruthy();
    expect(await screen.findByText('2/3 tài liệu sẵn sàng')).toBeTruthy();
    expect(screen.getByText('Tóm tắt nội dung chính của "a"')).toBeTruthy();
    expect(screen.getByText('Cuộc trò chuyện mới')).toBeTruthy();
    expect(screen.getByText('2 nguồn')).toBeTruthy();
  });

  it('sends the question typed on the assistant home exactly once', async () => {
    const screen = await renderView({ initialQuestion: 'Khi nào nên embed?' });
    await screen.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AssistantChatView workspaceId={WS.id} initialQuestion="Khi nào nên embed?" />
      </QueryClientProvider>,
    );

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('Khi nào nên embed?');
  });

  it('does not resend a question when opening an existing conversation', async () => {
    await renderView({ conversationId: 'c1', initialQuestion: 'x?' });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends a suggestion when pressed', async () => {
    const screen = await renderView();

    await fireEvent.press(await screen.findByText('Tóm tắt nội dung chính của "a"'));

    expect(sendMessage).toHaveBeenCalledWith('Tóm tắt nội dung chính của "a"');
  });

  it('titles the chat by its first question and shows the answer', async () => {
    jest.mocked(useChatStream).mockReturnValue(stream({
      messages: [
        { id: 'u', conversationId: 'c1', sender: 'USER', content: 'Embed hay reference?', createdAt: '' },
        { id: 'a', conversationId: 'c1', sender: 'ASSISTANT', content: 'Tuỳ cách đọc dữ liệu.', citations: [], createdAt: '' },
      ],
    }) as never);
    const screen = await renderView({ conversationId: 'c1' });

    expect(screen.getAllByText('Embed hay reference?').length).toBeGreaterThan(0);
    expect(screen.getByText('Tuỳ cách đọc dữ liệu.')).toBeTruthy();
  });

  it('lists the group’s documents from the sources button', async () => {
    const screen = await renderView();

    await fireEvent.press(await screen.findByTestId('chat-sources-button'));

    expect(await screen.findByText('Nguồn của trợ lý')).toBeTruthy();
    expect(screen.getByText('c.pdf')).toBeTruthy();
  });

  it('starts a new chat in another group from the header', async () => {
    const screen = await renderView();
    await screen.findByText('Hỏi kho tri thức Mongodb');

    await fireEvent.press(screen.getByTestId('chat-header-group'));
    await fireEvent.press(await screen.findByTestId(`group-option-${OTHER.id}`));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/workspace/${OTHER.id}/chat`));
  });

  it('locks the composer when the group has no ready document', async () => {
    jest.mocked(workspaceApi.getWorkspaceDocuments).mockResolvedValue({ content: [doc('c', 'PROCESSING')] } as never);
    const screen = await renderView();

    expect(await screen.findByPlaceholderText('Nhóm chưa có tài liệu sẵn sàng')).toBeTruthy();
  });
});
