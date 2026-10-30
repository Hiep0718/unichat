import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '../../../src/lib/toast-context';
import { workspaceApi } from '../../../src/features/workspaces/workspace-api';
import { ApiError } from '../../../src/lib/api-error';
import WorkspaceTabScreen from '../../../app/(tabs)/index';

jest.mock('../../../src/features/workspaces/workspace-api');
jest.mock('../../../src/features/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'sinhvien@hcmut.edu.vn', role: 'USER' },
    logout: jest.fn(),
  }),
}));

async function renderScreen() {
  return await render(
    <ToastProvider>
      <WorkspaceTabScreen />
    </ToastProvider>
  );
}

describe('Workspace tab load failures', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should report a failed workspace request instead of claiming the account is empty', async () => {
    (workspaceApi.getWorkspaces as jest.Mock).mockRejectedValueOnce(new ApiError(500, 'Lỗi máy chủ'));
    (workspaceApi.getExploreWorkspaces as jest.Mock).mockResolvedValueOnce({ content: [], totalElements: 0 });

    const { getByText, getAllByText, queryByText } = await renderScreen();

    await waitFor(() => expect(getByText('Không tải được dữ liệu')).toBeTruthy());
    // Shown on the card and in the toast, so the reader sees it whichever they look at.
    expect(getAllByText(/lỗi 500/i).length).toBeGreaterThan(0);
    expect(queryByText('Chưa có Không gian nào')).toBeNull();
  });

  it('should name an expired session rather than show a bare server code', async () => {
    (workspaceApi.getWorkspaces as jest.Mock).mockRejectedValueOnce(new ApiError(401, 'Unauthorized'));
    (workspaceApi.getExploreWorkspaces as jest.Mock).mockResolvedValueOnce({ content: [], totalElements: 0 });

    const { getAllByText } = await renderScreen();

    await waitFor(() => expect(getAllByText(/Phiên đăng nhập đã hết hạn/).length).toBeGreaterThan(0));
  });

  it('should still show the empty state when the account genuinely has no workspace', async () => {
    (workspaceApi.getWorkspaces as jest.Mock).mockResolvedValueOnce({ content: [], totalElements: 0 });
    (workspaceApi.getExploreWorkspaces as jest.Mock).mockResolvedValueOnce({ content: [], totalElements: 0 });

    const { getByText, queryByText } = await renderScreen();

    await waitFor(() => expect(getByText('Chưa có Không gian nào')).toBeTruthy());
    expect(queryByText('Không tải được dữ liệu')).toBeNull();
  });
});
