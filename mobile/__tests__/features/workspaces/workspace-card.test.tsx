import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WorkspaceCard } from '../../../src/features/workspaces/components/workspace-card';
import { WorkspaceItem } from '../../../src/features/workspaces/workspace-types';

describe('WorkspaceCard', () => {
  const mockWorkspace: WorkspaceItem = {
    id: 'ws-123',
    name: 'Giải tích 1',
    description: 'Tài liệu và đề thi Giải tích 1',
    visibility: 'PUBLIC',
    documentCount: 8,
    memberCount: 25,
  };

  it('renders workspace details properly in "mine" mode', () => {
    const onPressMock = jest.fn();
    const { getByText, getByTestId } = render(
      <WorkspaceCard
        workspace={mockWorkspace}
        mode="mine"
        onPress={onPressMock}
      />
    );

    expect(getByText('Giải tích 1')).toBeTruthy();
    expect(getByText('Tài liệu và đề thi Giải tích 1')).toBeTruthy();
    expect(getByText('8 tài liệu')).toBeTruthy();
    expect(getByText('25 thành viên')).toBeTruthy();
    expect(getByText('Công khai')).toBeTruthy();
    expect(getByText('Vào học')).toBeTruthy();

    fireEvent.press(getByTestId('workspace-card-ws-123'));
    expect(onPressMock).toHaveBeenCalledWith('ws-123');
  });

  it('renders "Tham gia" button in "explore" mode and triggers onJoin', () => {
    const onJoinMock = jest.fn();
    const { getByText, getByTestId } = render(
      <WorkspaceCard
        workspace={mockWorkspace}
        mode="explore"
        onJoin={onJoinMock}
      />
    );

    expect(getByText('Tham gia')).toBeTruthy();

    fireEvent.press(getByTestId('join-btn-ws-123'));
    expect(onJoinMock).toHaveBeenCalledWith('ws-123');
  });
});
