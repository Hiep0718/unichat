import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import {
  WorkspaceListEmpty,
  WorkspaceListError,
  WorkspaceListHead,
  WorkspaceSearch,
  WorkspaceSegment,
} from '../../../src/features/workspaces/components/workspace-list-states';
import { button } from '../../../src/design/tokens';

describe('WorkspaceSegment', () => {
  it('should name the tabs like the web group list and mark the current one', async () => {
    // Arrange
    const { getByRole } = await render(<WorkspaceSegment value="mine" onChange={jest.fn()} />);

    // Assert
    expect(getByRole('tab', { name: /Nhóm của tôi/ }).props.accessibilityState).toEqual({ selected: true });
    expect(getByRole('tab', { name: /Khám phá/ }).props.accessibilityState).toEqual({ selected: false });
  });

  it('should switch to explore when the explore tab is pressed', async () => {
    // Arrange
    const onChange = jest.fn();
    const { getByText } = await render(<WorkspaceSegment value="mine" onChange={onChange} />);

    // Act
    fireEvent.press(getByText('Khám phá'));

    // Assert
    expect(onChange).toHaveBeenCalledWith('explore');
  });
});

describe('WorkspaceListHead', () => {
  it('should offer a pill-shaped accent "Tạo nhóm" button on the own-groups tab', async () => {
    // Arrange
    const onCreate = jest.fn();
    const { getByLabelText, getByText } = await render(
      <WorkspaceListHead tab="mine" count={3} onCreate={onCreate} />,
    );

    // Act
    fireEvent.press(getByLabelText('Tạo nhóm mới'));

    // Assert
    expect(getByText('Tất cả nhóm')).toBeTruthy();
    expect(onCreate).toHaveBeenCalledTimes(1);
    const style = StyleSheet.flatten(getByLabelText('Tạo nhóm mới').props.style);
    expect(style.backgroundColor).toBe(button.primaryBg);
    expect(style.borderRadius).toBe(button.radius);
  });

  it('should hide the create button on the explore tab', async () => {
    // Arrange
    const { queryByLabelText, getByText } = await render(
      <WorkspaceListHead tab="explore" count={0} onCreate={jest.fn()} />,
    );

    // Assert
    expect(getByText('Nhóm công khai')).toBeTruthy();
    expect(queryByLabelText('Tạo nhóm mới')).toBeNull();
  });
});

describe('WorkspaceSearch', () => {
  it('should clear the query from the clear button', async () => {
    // Arrange
    const onChange = jest.fn();
    const { getByLabelText, getByPlaceholderText } = await render(
      <WorkspaceSearch value="mongo" onChange={onChange} />,
    );

    // Act
    fireEvent.press(getByLabelText('Xóa tìm kiếm'));

    // Assert
    expect(getByPlaceholderText('Tìm nhóm...')).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('WorkspaceListEmpty and WorkspaceListError', () => {
  it('should invite creating the first group when the account has none', async () => {
    // Arrange
    const onCreate = jest.fn();
    const { getByText } = await render(<WorkspaceListEmpty tab="mine" searching={false} onCreate={onCreate} />);

    // Act
    fireEvent.press(getByText('Tạo nhóm'));

    // Assert
    expect(getByText('Chưa có nhóm nào')).toBeTruthy();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('should say nothing matched instead of offering to create while searching', async () => {
    // Arrange
    const { getByText, queryByText } = await render(
      <WorkspaceListEmpty tab="mine" searching onCreate={jest.fn()} />,
    );

    // Assert
    expect(getByText('Không tìm thấy nhóm')).toBeTruthy();
    expect(queryByText('Tạo nhóm')).toBeNull();
  });

  it('should show the failure and retry when asked', async () => {
    // Arrange
    const onRetry = jest.fn();
    const { getByText } = await render(<WorkspaceListError message="Lỗi 500" onRetry={onRetry} />);

    // Act
    fireEvent.press(getByText('Thử lại'));

    // Assert
    expect(getByText('Lỗi 500')).toBeTruthy();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
