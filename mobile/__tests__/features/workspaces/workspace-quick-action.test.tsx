import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WorkspaceQuickAction } from '../../../src/features/workspaces/components/workspace-quick-action';

describe('WorkspaceQuickAction', () => {
  it('renders title, subtitle, and action text properly', () => {
    const onPressMock = jest.fn();
    const { getByText, getByTestId } = render(
      <WorkspaceQuickAction
        title="Kho tài liệu"
        subtitle="Xem và tải lên giáo trình, slide"
        actionText="Quản lý tài liệu"
        icon="folder"
        iconBgColor="#EFF6FF"
        actionColor="#00687A"
        onPress={onPressMock}
        testID="action-documents"
      />
    );

    expect(getByText('Kho tài liệu')).toBeTruthy();
    expect(getByText('Xem và tải lên giáo trình, slide')).toBeTruthy();
    expect(getByText('Quản lý tài liệu')).toBeTruthy();

    fireEvent.press(getByTestId('action-documents'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
