import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WorkspaceConversationsScreen from '../../../app/workspace/[id]/conversations';
import { chatApi } from '../../../src/features/chat/chat-api';
import { workspaceApi } from '../../../src/features/workspaces/workspace-api';
import { router, useLocalSearchParams } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../../src/features/chat/chat-api', () => ({
  chatApi: {
    getConversations: jest.fn(),
    deleteConversation: jest.fn(),
  },
}));

jest.mock('../../../src/features/workspaces/workspace-api', () => ({
  workspaceApi: {
    getWorkspace: jest.fn(),
  },
}));

jest.mock('../../../src/lib/toast-context', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

describe('WorkspaceConversationsScreen', () => {
  const mockWorkspaceId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: mockWorkspaceId });
    (workspaceApi.getWorkspace as jest.Mock).mockResolvedValue({
      id: mockWorkspaceId,
      name: 'Kiến trúc Phần mềm',
    });
  });

  it('renders conversations and allows opening a chat', async () => {
    (chatApi.getConversations as jest.Mock).mockResolvedValueOnce({
      items: [
        {
          id: 'conv-1',
          workspaceId: mockWorkspaceId,
          title: 'Giải thuật Dijkstra',
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
        },
      ],
    });

    const { getByText, getByTestId } = render(<WorkspaceConversationsScreen />);

    await waitFor(() => {
      expect(getByText('Giải thuật Dijkstra')).toBeTruthy();
      expect(getByText('1 cuộc trò chuyện')).toBeTruthy();
    });

    fireEvent.press(getByTestId('conversation-item-conv-1'));
    expect(router.push).toHaveBeenCalledWith(
      `/workspace/${mockWorkspaceId}/chat/conv-1`
    );
  });

  it('filters conversations by search keyword', async () => {
    (chatApi.getConversations as jest.Mock).mockResolvedValueOnce({
      items: [
        {
          id: 'conv-1',
          workspaceId: mockWorkspaceId,
          title: 'Mạng nơ-ron tích chập (CNN)',
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
        },
        {
          id: 'conv-2',
          workspaceId: mockWorkspaceId,
          title: 'Cơ sở dữ liệu NoSQL',
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
        },
      ],
    });

    const { getByText, queryByText, getByTestId } = render(
      <WorkspaceConversationsScreen />
    );

    await waitFor(() => {
      expect(getByText('Mạng nơ-ron tích chập (CNN)')).toBeTruthy();
      expect(getByText('Cơ sở dữ liệu NoSQL')).toBeTruthy();
    });

    fireEvent.changeText(
      getByTestId('conversations-search-input'),
      'CNN'
    );

    expect(getByText('Mạng nơ-ron tích chập (CNN)')).toBeTruthy();
    expect(queryByText('Cơ sở dữ liệu NoSQL')).toBeNull();
  });

  it('shows empty state when no conversations exist and provides new chat button', async () => {
    (chatApi.getConversations as jest.Mock).mockResolvedValueOnce({
      items: [],
    });

    const { getByText, getByTestId } = render(<WorkspaceConversationsScreen />);

    await waitFor(() => {
      expect(getByText('Chưa có cuộc trò chuyện nào')).toBeTruthy();
    });

    fireEvent.press(getByTestId('conversations-new-chat-btn'));
    expect(router.push).toHaveBeenCalledWith(
      `/workspace/${mockWorkspaceId}/chat/index`
    );
  });

  it('navigates back when back button pressed', async () => {
    (chatApi.getConversations as jest.Mock).mockResolvedValueOnce({
      items: [],
    });

    const { getByTestId } = render(<WorkspaceConversationsScreen />);

    await waitFor(() => {
      expect(getByTestId('conversations-back-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('conversations-back-btn'));
    expect(router.back).toHaveBeenCalled();
  });

  it('should load later pages without silently limiting history to the first page', async () => {
    const item = (id: string) => ({ id, workspaceId: mockWorkspaceId, title: `Hội thoại ${id}`, createdAt: '2026-10-11T00:00:00Z' });
    (chatApi.getConversations as jest.Mock).mockResolvedValueOnce({ items: [item('first')], totalElements: 21, totalPages: 2 })
      .mockResolvedValueOnce({ items: [item('last')], totalElements: 21, totalPages: 2 });
    const { getByText, getByTestId, queryByTestId } = render(<WorkspaceConversationsScreen />);
    await waitFor(() => expect(getByText('Hội thoại first')).toBeTruthy());
    fireEvent.press(getByTestId('conversations-load-more'));
    await waitFor(() => expect(getByText('Hội thoại last')).toBeTruthy());
    expect(chatApi.getConversations).toHaveBeenNthCalledWith(1, mockWorkspaceId, { page: 0, size: 20 });
    expect(chatApi.getConversations).toHaveBeenNthCalledWith(2, mockWorkspaceId, { page: 1, size: 20 });
    expect(queryByTestId('conversations-load-more')).toBeNull();
  });
});
