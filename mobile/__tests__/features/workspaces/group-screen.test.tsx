import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import WorkspaceDetailScreen from '../../../app/workspace/[id]/index';
import { DocumentList } from '../../../src/features/documents/document-list';
import { workspaceApi } from '../../../src/features/workspaces/workspace-api';
import { ApiError } from '../../../src/lib/api-error';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(),
  useFocusEffect: jest.fn(),
}));
jest.mock('../../../src/features/workspaces/workspace-api', () => ({
  workspaceApi: { getWorkspace: jest.fn(), getWorkspacePosts: jest.fn(), getWorkspaceDocuments: jest.fn() },
}));
jest.mock('../../../src/features/auth/auth-context', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
const mockShowToast = jest.fn();
jest.mock('../../../src/lib/toast-context', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const ID = '123e4567-e89b-12d3-a456-426614174000';
const api = jest.mocked(workspaceApi);

describe('Group screen loading and errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: ID });
  });

  it('shows a skeleton shaped like the screen, with a working back button', async () => {
    api.getWorkspace.mockReturnValue(new Promise(() => undefined));
    const screen = await render(<WorkspaceDetailScreen />);

    expect(screen.getByTestId('group-loading')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('group-back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('offers a retry after a network failure and recovers', async () => {
    api.getWorkspace
      .mockRejectedValueOnce(new ApiError(0, 'Mất kết nối'))
      .mockResolvedValueOnce({ id: ID, name: 'Mongodb', visibility: 'PRIVATE', documentCount: 1, memberCount: 2 } as never);
    api.getWorkspacePosts.mockResolvedValue({ content: [] } as never);
    const screen = await render(<WorkspaceDetailScreen />);

    expect(await screen.findByText('Không tải được nhóm')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('group-retry'));

    expect(await screen.findByText('Mongodb')).toBeTruthy();
  });

  it('says the group is gone, without a pointless retry, when access is refused', async () => {
    api.getWorkspace.mockRejectedValueOnce(new ApiError(404, 'Not found'));
    const screen = await render(<WorkspaceDetailScreen />);

    expect(await screen.findByText('Không tìm thấy nhóm này')).toBeTruthy();
    expect(screen.queryByTestId('group-retry')).toBeNull();
  });
});

describe('DocumentList inset', () => {
  it('pads each file card, not the header, so the cover keeps full width', async () => {
    const doc = { id: 'd1', name: 'a.pdf', mimeType: 'application/pdf', fileSizeBytes: 10, status: 'PROCESSED' as const, createdAt: '' };
    const screen = await render(
      <DocumentList documents={[doc]} refreshing={false} onRefresh={jest.fn()} inset={16} header={<></>} />,
    );

    const wrapper = screen.getByTestId('doc-item-d1').parent;
    expect(StyleSheet.flatten(wrapper?.props.style)).toMatchObject({ paddingHorizontal: 16 });
  });
});
