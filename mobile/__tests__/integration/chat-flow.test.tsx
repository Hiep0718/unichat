import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '../../src/lib/toast-context';
import { workspaceApi } from '../../src/features/workspaces/workspace-api';
import WorkspaceTabScreen from '../../app/(tabs)/index';

jest.mock('../../src/features/workspaces/workspace-api');
jest.mock('../../src/features/chat/chat-api');
jest.mock('../../src/lib/sse-client');
jest.mock('../../src/features/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'sinhvien@hcmut.edu.vn', role: 'USER' },
    logout: jest.fn(),
  }),
}));

describe('Integration Flow: Workspace to Chat Experience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads workspaces, renders cards, and allows interaction', async () => {
    const mockWorkspaces = {
      content: [
        {
          id: 'ws-rag-1',
          name: 'Hệ thống Phân tán',
          description: 'Học phần nâng cao kỳ 1 năm 2026',
          visibility: 'PUBLIC' as const,
          documentCount: 3,
          memberCount: 42,
          userRole: 'MEMBER' as const,
        },
      ],
      totalElements: 1,
    };

    (workspaceApi.getWorkspaces as jest.Mock).mockResolvedValueOnce(mockWorkspaces);
    (workspaceApi.getExploreWorkspaces as jest.Mock).mockResolvedValueOnce({
      content: [],
      totalElements: 0,
    });

    const { getByText, getByTestId } = render(
      <ToastProvider>
        <WorkspaceTabScreen />
      </ToastProvider>
    );

    // Initial render and data fetch
    await waitFor(() => {
      expect(getByText('Hệ thống Phân tán')).toBeTruthy();
      expect(getByText('Học phần nâng cao kỳ 1 năm 2026')).toBeTruthy();
      expect(getByText('3 tài liệu')).toBeTruthy();
      expect(getByText('42 thành viên')).toBeTruthy();
      expect(getByText('Vào học')).toBeTruthy();
    });

    // Card exists and can be tapped
    const card = getByTestId('workspace-card-ws-rag-1');
    expect(card).toBeTruthy();
    fireEvent.press(card);
  });
});
