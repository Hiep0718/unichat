import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { GroupMembersTab } from '../../../src/features/workspaces/components/group-members-tab';

import type { GroupMember } from '../../../src/features/workspaces/workspace-types';

const ME = 'me-0001';

function member(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    userId: 'u-other',
    email: 'taolahieptqn122@gmail.com',
    displayName: 'taolahieptqn122',
    hasAvatar: false,
    avatarColor: null,
    role: 'VIEWER',
    status: 'ACTIVE',
    invitedById: ME,
    ...overrides,
  };
}

const owner = member({
  userId: ME,
  email: 'hungdz1372004@gmail.com',
  displayName: 'hungdz1372004',
  role: 'OWNER',
});

function renderTab(
  options: {
    members?: GroupMember[];
    loading?: boolean;
    isOwner?: boolean;
    onInvite?: () => void;
  } = {},
) {
  return render(
    <GroupMembersTab
      members={options.members ?? [owner, member()]}
      loading={options.loading ?? false}
      isOwner={options.isOwner ?? true}
      currentUserId={ME}
      onInvite={options.onInvite ?? jest.fn()}
    />,
  );
}

describe('GroupMembersTab', () => {
  it('should name each role in Vietnamese rather than the stored value', async () => {
    // Arrange, Act
    const { getByText, queryByText } = await renderTab();

    // Assert
    expect(getByText('Chủ sở hữu · Bạn')).toBeTruthy();
    expect(getByText('Người xem')).toBeTruthy();
    expect(queryByText('OWNER')).toBeNull();
    expect(queryByText('VIEWER')).toBeNull();
  });

  it('should mark the viewer’s own row', async () => {
    // Arrange, Act
    const { getByText } = await renderTab();

    // Assert
    expect(getByText('Chủ sở hữu · Bạn')).toBeTruthy();
  });

  it('should list each member by address', async () => {
    // Arrange, Act
    const { getByText } = await renderTab();

    // Assert
    expect(getByText('hungdz1372004@gmail.com')).toBeTruthy();
    expect(getByText('taolahieptqn122@gmail.com')).toBeTruthy();
  });

  it('should say plainly that only the owner may read this list', async () => {
    // Arrange, Act: Core API từ chối danh sách này với vai trò khác, nên một
    // danh sách rỗng ở đây sẽ trông như nhóm không có ai.
    const { getByText, queryByText } = await renderTab({ isOwner: false, members: [] });

    // Assert
    expect(getByText(/Chỉ chủ sở hữu xem được danh sách thành viên/)).toBeTruthy();
    expect(queryByText('Mời thành viên')).toBeNull();
  });

  it('should offer to invite someone once the list has been read', async () => {
    // Arrange
    const onInvite = jest.fn();
    const { getByText } = await renderTab({ onInvite });

    // Act
    await fireEvent.press(getByText('Mời thành viên'));

    // Assert
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it('should show nothing but a spinner while the list loads', async () => {
    // Arrange, Act
    const { queryByText } = await renderTab({ loading: true, members: [] });

    // Assert
    expect(queryByText('Mời thành viên')).toBeNull();
    expect(queryByText(/Chỉ chủ sở hữu/)).toBeNull();
  });
});
