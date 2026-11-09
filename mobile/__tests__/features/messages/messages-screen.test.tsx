import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';

import MessagesScreen from '../../../app/(tabs)/messages';
import { messagesApi } from '../../../src/features/messages/messages-api';

import type { Conversation } from '../../../src/features/messages/messages-api';

jest.mock('../../../src/features/messages/messages-api', () => ({
  ...jest.requireActual('../../../src/features/messages/messages-api'),
  messagesApi: {
    fetchConversations: jest.fn(),
    fetchContacts: jest.fn(),
    openConversation: jest.fn(),
  },
}));
jest.mock('../../../src/features/auth/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const mockShowToast = jest.fn();
jest.mock('../../../src/lib/toast-context', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const api = jest.mocked(messagesApi);

const direct: Conversation = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  kind: 'DIRECT',
  title: 'Phi Hung',
  otherUserId: 'u2',
  participants: [
    { userId: 'u1', name: 'Tôi', role: 'MEMBER', me: true },
    { userId: 'u2', name: 'Phi Hung', role: 'MEMBER', me: false },
  ],
  lastMessage: 'hi',
  lastMessageAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
  unreadCount: 2,
  hasAvatar: false,
};

const group: Conversation = {
  ...direct,
  id: '223e4567-e89b-12d3-a456-426614174000',
  kind: 'GROUP',
  title: 'Nhóm vip',
  otherUserId: null,
  participants: [
    { userId: 'u1', name: 'Tôi', role: 'OWNER', me: true },
    { userId: 'u2', name: 'Phi Hung', role: 'MEMBER', me: false },
    { userId: 'u3', name: 'Mai', role: 'MEMBER', me: false },
  ],
  lastMessage: null,
  lastMessageAt: null,
  unreadCount: 0,
};

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MessagesScreen />
    </QueryClientProvider>,
  );
}

describe('MessagesScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('heads the screen with the same dark title band as the other tabs', async () => {
    api.fetchConversations.mockResolvedValue([]);
    const screen = await renderScreen();

    expect(screen.getByRole('header', { name: 'Tin nhắn' })).toBeTruthy();
    expect(screen.getByText('Trò chuyện riêng và nhóm chat với người cùng nhóm.')).toBeTruthy();
  });

  it('lists direct and group conversations with their previews', async () => {
    api.fetchConversations.mockResolvedValue([direct, group]);
    const screen = await renderScreen();

    expect(await screen.findByText('Phi Hung')).toBeTruthy();
    expect(screen.getByText('Nhóm vip')).toBeTruthy();
    expect(screen.getByText('Chưa có tin nhắn')).toBeTruthy();
    expect(screen.getByText('1 tuần')).toBeTruthy();
    expect(screen.getByTestId('group-avatar')).toBeTruthy();
  });

  it('opens the thread when a conversation is pressed', async () => {
    api.fetchConversations.mockResolvedValue([direct]);
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByTestId(`conversation-row-${direct.id}`));

    expect(router.push).toHaveBeenCalledWith(`/messages/${direct.id}`);
  });

  it('filters by name as the user types', async () => {
    api.fetchConversations.mockResolvedValue([direct, group]);
    const screen = await renderScreen();
    await screen.findByText('Nhóm vip');

    await fireEvent.changeText(screen.getByTestId('conversation-search-input'), 'vip');

    expect(screen.queryByText('Phi Hung')).toBeNull();
    expect(screen.getByText('Nhóm vip')).toBeTruthy();
  });

  it('shows an empty state when there are no conversations', async () => {
    api.fetchConversations.mockResolvedValue([]);
    const screen = await renderScreen();

    expect(await screen.findByTestId('messages-empty')).toBeTruthy();
  });

  it('offers a retry when the list fails to load', async () => {
    api.fetchConversations.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([direct]);
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByText('Không tải được tin nhắn. Chạm để thử lại.'));

    expect(await screen.findByText('Phi Hung')).toBeTruthy();
  });

  it('starts a conversation with a contact from the picker', async () => {
    api.fetchConversations.mockResolvedValue([]);
    api.fetchContacts.mockResolvedValue([{ userId: 'u9', name: 'Lan Anh', sharedGroup: 'CNPM' }]);
    api.openConversation.mockResolvedValue(direct);
    const screen = await renderScreen();

    await fireEvent.press(screen.getByTestId('new-message-button'));
    await fireEvent.press(await screen.findByTestId('contact-row-u9'));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/messages/${direct.id}`));
    expect(api.openConversation).toHaveBeenCalledWith('u9');
  });

  it('tells the user when a conversation cannot be opened', async () => {
    api.fetchConversations.mockResolvedValue([]);
    api.fetchContacts.mockResolvedValue([{ userId: 'u9', name: 'Lan Anh', sharedGroup: 'CNPM' }]);
    api.openConversation.mockRejectedValue(new Error('Không còn cùng nhóm'));
    const screen = await renderScreen();

    await fireEvent.press(screen.getByTestId('new-message-button'));
    await fireEvent.press(await screen.findByTestId('contact-row-u9'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith({ message: 'Không còn cùng nhóm', type: 'error' }));
    expect(router.push).not.toHaveBeenCalled();
  });
});
