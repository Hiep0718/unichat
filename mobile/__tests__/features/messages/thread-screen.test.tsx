import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';

import ThreadScreen from '../../../app/messages/[conversationId]';
import { messagesApi } from '../../../src/features/messages/messages-api';

import type { DirectMessage } from '../../../src/features/messages/messages-api';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('../../../src/features/messages/messages-api', () => ({
  ...jest.requireActual('../../../src/features/messages/messages-api'),
  messagesApi: {
    fetchConversations: jest.fn(),
    fetchMessages: jest.fn(),
    fetchCallHistory: jest.fn(),
    markRead: jest.fn(),
    sendMessage: jest.fn(),
  },
}));
jest.mock('../../../src/features/auth/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const mockShowToast = jest.fn();
jest.mock('../../../src/lib/toast-context', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const api = jest.mocked(messagesApi);
const ID = '123e4567-e89b-12d3-a456-426614174000';

function message(id: string, body: string, mine: boolean, minutesAgo: number): DirectMessage {
  return {
    id,
    conversationId: ID,
    senderId: mine ? 'me' : 'u2',
    senderName: mine ? 'Tôi' : 'Phi Hung',
    body,
    mine,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    attachments: [],
  };
}

function renderThread() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThreadScreen />
    </QueryClientProvider>,
  );
}

describe('ThreadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useLocalSearchParams).mockReturnValue({ conversationId: ID });
    api.fetchConversations.mockResolvedValue([{
      id: ID,
      kind: 'DIRECT',
      title: 'Phi Hung',
      otherUserId: 'u2',
      participants: [],
      lastMessage: 'hi',
      lastMessageAt: null,
      unreadCount: 1,
      hasAvatar: false,
    }]);
    api.markRead.mockResolvedValue(undefined);
    api.fetchCallHistory.mockResolvedValue([]);
  });

  it('shows the conversation, a sent status on my last message and marks it read', async () => {
    api.fetchMessages.mockResolvedValue([message('m2', 'chào bạn', true, 1), message('m1', 'hello', false, 5)]);
    const screen = await renderThread();

    expect(await screen.findByText('hello')).toBeTruthy();
    expect(screen.getByText('chào bạn')).toBeTruthy();
    expect(screen.getByText('Đã gửi')).toBeTruthy();
    expect(await screen.findByText('Tin nhắn riêng')).toBeTruthy();
    expect(api.markRead).toHaveBeenCalledWith(ID);
  });

  it('shows grouped calls inside the thread', async () => {
    api.fetchMessages.mockResolvedValue([]);
    const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
    api.fetchCallHistory.mockResolvedValue([
      { id: 'c1', outgoing: true, media: 'AUDIO', status: 'MISSED', startedAt: at(3), talkSeconds: 0 },
      { id: 'c2', outgoing: true, media: 'AUDIO', status: 'MISSED', startedAt: at(2), talkSeconds: 0 },
    ]);
    const screen = await renderThread();

    expect(await screen.findByText('2 cuộc gọi không trả lời')).toBeTruthy();
  });

  it('sends a message and clears the composer', async () => {
    api.fetchMessages.mockResolvedValue([]);
    api.sendMessage.mockResolvedValue(message('m3', 'xin chào', true, 0));
    const screen = await renderThread();
    await screen.findByText('Hãy gửi lời chào đầu tiên.');

    await fireEvent.changeText(screen.getByTestId('message-input'), 'xin chào');
    await fireEvent.press(screen.getByTestId('send-message-button'));

    expect(await screen.findByText('xin chào')).toBeTruthy();
    expect(api.sendMessage).toHaveBeenCalledWith(ID, 'xin chào');
    expect(screen.getByTestId('message-input').props.value).toBe('');
  });

  it('keeps the text and reports the error when sending fails', async () => {
    api.fetchMessages.mockResolvedValue([]);
    api.sendMessage.mockRejectedValue(new Error('Mất kết nối'));
    const screen = await renderThread();
    await screen.findByText('Hãy gửi lời chào đầu tiên.');

    await fireEvent.changeText(screen.getByTestId('message-input'), 'thử lại');
    await fireEvent.press(screen.getByTestId('send-message-button'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith({ message: 'Mất kết nối', type: 'error' }));
    expect(screen.getByTestId('message-input').props.value).toBe('thử lại');
  });

  it('explains that calling is web-only for now', async () => {
    api.fetchMessages.mockResolvedValue([]);
    const screen = await renderThread();

    await fireEvent.press(await screen.findByTestId('thread-call-button'));

    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'info' }));
  });

  it('offers a retry when the thread fails to load', async () => {
    api.fetchMessages.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([message('m1', 'hello', false, 5)]);
    const screen = await renderThread();

    await fireEvent.press(await screen.findByText('Không tải được tin nhắn. Chạm để thử lại.'));

    expect(await screen.findByText('hello')).toBeTruthy();
  });

  it('refuses a malformed conversation id without calling the API', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ conversationId: 'abc' });
    const screen = await renderThread();

    expect(screen.getByText('Cuộc trò chuyện không tồn tại.')).toBeTruthy();
    expect(api.fetchMessages).not.toHaveBeenCalled();
  });
});
