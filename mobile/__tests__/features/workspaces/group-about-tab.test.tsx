import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { GroupAboutTab } from '../../../src/features/workspaces/components/group-about-tab';

import type { WorkspaceDetail } from '../../../src/features/workspaces/workspace-types';

function workspace(overrides: Partial<WorkspaceDetail> = {}): WorkspaceDetail {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Mongodb',
    description: '',
    visibility: 'PUBLIC',
    documentCount: 6,
    memberCount: 3,
    postCount: 3,
    topics: ['Cơ sở dữ liệu'],
    userRole: 'OWNER',
    createdAt: '2026-09-07T00:00:00Z',
    ...overrides,
  };
}

function renderTab(
  overrides: Partial<WorkspaceDetail> = {},
  options: { isOwner?: boolean; onEdit?: () => void; onAsk?: () => void } = {},
) {
  return render(
    <GroupAboutTab
      workspace={workspace(overrides)}
      isOwner={options.isOwner ?? true}
      onEditDescription={options.onEdit ?? jest.fn()}
      onAskAssistant={options.onAsk ?? jest.fn()}
    />,
  );
}

describe('GroupAboutTab description', () => {
  it('should ask the owner to write the first description', async () => {
    // Arrange, Act: mô tả trống là một việc để làm, không chỉ là một dữ kiện.
    const { getByText } = await renderTab({ description: '' });

    // Assert
    expect(getByText(/Viết vài dòng để người mới biết nhóm học gì/)).toBeTruthy();
    expect(getByText('Thêm mô tả')).toBeTruthy();
  });

  it('should offer to change a description that already exists', async () => {
    // Arrange, Act
    const { getByText, queryByText } = await renderTab({
      description: 'Nhóm học MongoDB từ cơ bản tới nâng cao.',
    });

    // Assert
    expect(getByText('Nhóm học MongoDB từ cơ bản tới nâng cao.')).toBeTruthy();
    expect(getByText('Chỉnh sửa')).toBeTruthy();
    expect(queryByText('Thêm mô tả')).toBeNull();
  });

  it('should offer a non-owner no way to edit it', async () => {
    // Arrange, Act
    const { queryByText } = await renderTab({ description: '' }, { isOwner: false });

    // Assert
    expect(queryByText('Thêm mô tả')).toBeNull();
    expect(queryByText('Chỉnh sửa')).toBeNull();
  });

  it('should show what the group is about', async () => {
    // Arrange, Act
    const { getByText } = await renderTab();

    // Assert
    expect(getByText('Cơ sở dữ liệu')).toBeTruthy();
  });
});

describe('GroupAboutTab facts', () => {
  it('should state the viewer’s role in Vietnamese', async () => {
    // Arrange, Act
    const { getByText } = await renderTab({ userRole: 'VIEWER' });

    // Assert
    expect(getByText('Vai trò của bạn')).toBeTruthy();
    expect(getByText('Người xem')).toBeTruthy();
  });

  it('should name the access level rather than its stored value', async () => {
    // Arrange, Act
    const { getByText, queryByText } = await renderTab({ visibility: 'PUBLIC' });

    // Assert
    expect(getByText('Công khai')).toBeTruthy();
    expect(queryByText('PUBLIC')).toBeNull();
  });

  it('should format the creation date for a Vietnamese reader', async () => {
    // Arrange, Act
    const { getByText } = await renderTab({ createdAt: '2026-09-07T00:00:00Z' });

    // Assert
    expect(getByText('07/09/2026')).toBeTruthy();
  });

  it('should leave the date blank rather than print "Invalid Date"', async () => {
    // Arrange, Act: một chuỗi ngày hỏng vẫn phải đọc ra được.
    const { getByText } = await renderTab({ createdAt: 'khong-phai-ngay' });

    // Assert
    expect(getByText('—')).toBeTruthy();
  });

  it('should lead into the assistant', async () => {
    // Arrange
    const onAsk = jest.fn();
    const { getByText } = await renderTab({}, { onAsk });

    // Act
    await fireEvent.press(getByText('Trợ lý AI của nhóm'));

    // Assert
    expect(onAsk).toHaveBeenCalledTimes(1);
  });
});
