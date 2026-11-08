import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';

import AssistantScreen from '../../../app/(tabs)/chat';
import { chatApi } from '../../../src/features/chat/chat-api';
import { workspaceApi } from '../../../src/features/workspaces/workspace-api';

jest.mock('../../../src/features/chat/chat-api', () => ({
  chatApi: { getConversations: jest.fn(), deleteConversation: jest.fn() },
}));
jest.mock('../../../src/features/workspaces/workspace-api', () => ({
  workspaceApi: { getWorkspaces: jest.fn(), getWorkspaceDocuments: jest.fn() },
}));
jest.mock('../../../src/features/auth/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const mockShowToast = jest.fn();
jest.mock('../../../src/lib/toast-context', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const MONGO = { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Mongodb', visibility: 'PRIVATE', documentCount: 6, memberCount: 3 };
const OOP = { id: '223e4567-e89b-12d3-a456-426614174000', name: 'Lập trình hướng đối tượng', visibility: 'PRIVATE', documentCount: 33, memberCount: 3 };
const now = new Date().toISOString();

function conversations(workspaceId: string) {
  const items = workspaceId === MONGO.id
    ? [{ id: 'c1', workspaceId, title: 'Nhúng hay tham chiếu dữ liệu?', createdAt: now, lastMessageAt: now }]
    : [{ id: 'c2', workspaceId, title: 'Đa hình là gì?', createdAt: '2026-01-01T00:00:00Z', lastMessageAt: '2026-01-01T00:00:00Z' }];
  return Promise.resolve({ items, content: items, number: 0, size: 20, totalElements: items.length, totalPages: 1 });
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AssistantScreen />
    </QueryClientProvider>,
  );
}

describe('AssistantScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(workspaceApi.getWorkspaces).mockResolvedValue({ content: [OOP, MONGO] } as never);
    jest.mocked(workspaceApi.getWorkspaceDocuments).mockResolvedValue({ content: [] } as never);
    jest.mocked(chatApi.getConversations).mockImplementation((id) => conversations(id) as never);
  });

  it('defaults to the group asked most recently and shows only its history', async () => {
    const screen = await renderScreen();

    expect(await screen.findByText('Nhúng hay tham chiếu dữ liệu?')).toBeTruthy();
    expect(screen.getByText('Mongodb')).toBeTruthy();
    expect(screen.queryByText('Đa hình là gì?')).toBeNull();
  });

  it('shows every group’s history on request', async () => {
    const screen = await renderScreen();
    await screen.findByText('Nhúng hay tham chiếu dữ liệu?');

    await fireEvent.press(screen.getByTestId('history-scope-toggle'));

    expect(screen.getByText('Đa hình là gì?')).toBeTruthy();
  });

  it('opens a new chat in the chosen group with the question attached', async () => {
    const screen = await renderScreen();
    await screen.findByText('Nhúng hay tham chiếu dữ liệu?');

    await fireEvent.changeText(screen.getByTestId('assistant-question-input'), 'Khi nào nên embed?');
    await fireEvent.press(screen.getByTestId('assistant-send'));

    expect(router.push).toHaveBeenCalledWith(`/workspace/${MONGO.id}/chat?q=Khi%20n%C3%A0o%20n%C3%AAn%20embed%3F`);
  });

  it('switches group from the picker', async () => {
    const screen = await renderScreen();
    await screen.findByText('Nhúng hay tham chiếu dữ liệu?');

    await fireEvent.press(screen.getByTestId('assistant-group-chip'));
    await fireEvent.press(screen.getByTestId(`group-option-${OOP.id}`));

    expect(await screen.findByText('Đa hình là gì?')).toBeTruthy();
    expect(screen.queryByText('Nhúng hay tham chiếu dữ liệu?')).toBeNull();
  });

  it('opens a conversation from history', async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByTestId('history-row-c1'));

    expect(router.push).toHaveBeenCalledWith(`/workspace/${MONGO.id}/chat/c1`);
  });

  it('deletes a conversation after confirmation on long press', async () => {
    jest.mocked(chatApi.deleteConversation).mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    });
    const screen = await renderScreen();

    await fireEvent(await screen.findByTestId('history-row-c1'), 'longPress');

    await waitFor(() => expect(chatApi.deleteConversation).toHaveBeenCalledWith(MONGO.id, 'c1'));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })));
    alert.mockRestore();
  });

  it('offers a retry when nothing loads', async () => {
    jest.mocked(workspaceApi.getWorkspaces).mockRejectedValueOnce(new Error('down'));
    const screen = await renderScreen();

    expect(await screen.findByText('Không tải được lịch sử. Chạm để thử lại.')).toBeTruthy();
  });
});
