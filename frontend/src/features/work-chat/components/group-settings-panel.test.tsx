import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GroupSettingsPanel } from './group-settings-panel';
import type { ChatParticipant, Conversation } from '../work-chat-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

// The avatar a group has set is fetched as a blob with a bearer token. The
// panel's behaviour does not depend on the bytes arriving, and a test must not
// reach the network for them.
vi.mock('../../../components/avatar-image-cache', () => ({
  loadAvatar: () => Promise.resolve(null),
  loadGroupAvatar: () => Promise.resolve(null),
}));

const asOwner: ChatParticipant[] = [
  { userId: 'u1', name: 'Hùng', role: 'OWNER', me: true },
  { userId: 'u2', name: 'Minh Anh', role: 'MEMBER', me: false },
];

const asMember: ChatParticipant[] = [
  { userId: 'u1', name: 'Hùng', role: 'OWNER', me: false },
  { userId: 'u2', name: 'Minh Anh', role: 'MEMBER', me: true },
];

type Handler = 'onAdd' | 'onRemove' | 'onLeave' | 'onRename'
  | 'onPickAvatar' | 'onRemoveAvatar';

function groupOf(participants: ChatParticipant[], hasAvatar = false): Conversation {
  return {
    id: 'c1',
    kind: 'GROUP',
    title: 'Nhóm đồ án',
    otherUserId: null,
    participants,
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    hasAvatar,
  };
}

function renderPanel(
  participants: ChatParticipant[],
  overrides: Partial<Record<Handler, () => Promise<void>>> = {},
  conversation: Conversation = groupOf(participants),
) {
  const props = {
    conversation,
    participants,
    onAdd: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onLeave: vi.fn().mockResolvedValue(undefined),
    onRename: vi.fn().mockResolvedValue(undefined),
    onPickAvatar: vi.fn().mockResolvedValue(undefined),
    onRemoveAvatar: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<GroupSettingsPanel {...props} />);
  return props;
}

describe('GroupSettingsPanel', () => {
  it('should list everyone and mark the owner', () => {
    // Arrange and Act
    renderPanel(asOwner);

    // Assert
    expect(screen.getByText(/Hùng/)).toBeInTheDocument();
    expect(screen.getByText('Minh Anh')).toBeInTheDocument();
    expect(screen.getByText('Chủ nhóm')).toBeInTheDocument();
  });

  it('should offer the owner a way to add and remove people', () => {
    // Arrange and Act
    renderPanel(asOwner);

    // Assert
    expect(screen.getByText('Thêm thành viên')).toBeInTheDocument();
    expect(screen.getByLabelText('Xóa Minh Anh khỏi nhóm')).toBeInTheDocument();
  });

  it('should hide those controls from a member who is not the owner', () => {
    // Arrange and Act: the server refuses the calls regardless, so hiding the
    // buttons is for clarity rather than for safety.
    renderPanel(asMember);

    // Assert
    expect(screen.queryByText('Thêm thành viên')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Xóa Hùng khỏi nhóm')).not.toBeInTheDocument();
  });

  it('should not offer the owner a way to remove themselves', () => {
    // Arrange and Act: leaving is its own action, because it hands the group on.
    renderPanel(asOwner);

    // Assert
    expect(screen.queryByLabelText('Xóa Hùng khỏi nhóm')).not.toBeInTheDocument();
  });

  it('should let anyone leave', async () => {
    // Arrange
    const props = renderPanel(asMember);

    // Act
    await userEvent.click(screen.getByText('Rời nhóm'));

    // Assert
    expect(props.onLeave).toHaveBeenCalled();
  });

  it('should remove the person whose button was pressed', async () => {
    // Arrange
    const props = renderPanel(asOwner);

    // Act
    await userEvent.click(screen.getByLabelText('Xóa Minh Anh khỏi nhóm'));

    // Assert
    expect(props.onRemove).toHaveBeenCalledWith('u2');
  });

  it('should keep the panel open and show why a change was refused', async () => {
    // Arrange
    renderPanel(asOwner, {
      onRemove: vi.fn().mockRejectedValue(new Error('Chỉ chủ nhóm mới thay đổi được nhóm')),
    });

    // Act
    await userEvent.click(screen.getByLabelText('Xóa Minh Anh khỏi nhóm'));

    // Assert
    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Chỉ chủ nhóm mới thay đổi được nhóm');
    expect(screen.getByText('Minh Anh')).toBeInTheDocument();
  });
});

describe('naming a group', () => {
  it('should offer the rename control to the owner', () => {
    // Arrange: the server has accepted renames all along, but nothing in the
    // UI ever called it.
    renderPanel(asOwner);

    // Assert
    expect(screen.getByLabelText('Đổi tên nhóm')).toBeInTheDocument();
  });

  it('should not offer it to a member', () => {
    // Arrange
    renderPanel(asMember);

    // Assert
    expect(screen.queryByLabelText('Đổi tên nhóm')).not.toBeInTheDocument();
  });

  it('should save the new name', async () => {
    // Arrange
    const props = renderPanel(asOwner);
    await userEvent.click(screen.getByLabelText('Đổi tên nhóm'));

    // Act
    const field = screen.getByLabelText('Tên nhóm');
    await userEvent.clear(field);
    await userEvent.type(field, 'Nhóm báo cáo');
    await userEvent.click(screen.getByText('Lưu'));

    // Assert
    expect(props.onRename).toHaveBeenCalledWith('Nhóm báo cáo');
  });

  it('should not call the server when the name was left unchanged', async () => {
    // Arrange: an empty PATCH would still bump the group for everyone else.
    const props = renderPanel(asOwner);
    await userEvent.click(screen.getByLabelText('Đổi tên nhóm'));

    // Act
    await userEvent.click(screen.getByText('Lưu'));

    // Assert
    expect(props.onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Nhóm đồ án')).toBeInTheDocument();
  });

  it('should abandon the edit and keep the old name on cancel', async () => {
    // Arrange
    const props = renderPanel(asOwner);
    await userEvent.click(screen.getByLabelText('Đổi tên nhóm'));
    await userEvent.type(screen.getByLabelText('Tên nhóm'), ' sửa dở');

    // Act
    await userEvent.click(screen.getByText('Hủy'));

    // Assert
    expect(props.onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Nhóm đồ án')).toBeInTheDocument();
  });
});

describe("a group's picture", () => {
  const image = () =>
    new File(['fake png bytes'], 'nhom.png', { type: 'image/png' });

  it('should let the owner add one', async () => {
    // Arrange: two groups of the same people were indistinguishable in the
    // list, which is the common case for a team.
    const props = renderPanel(asOwner);

    // Act
    await userEvent.upload(screen.getByLabelText('Chọn ảnh đại diện nhóm'), image());

    // Assert
    expect(props.onPickAvatar).toHaveBeenCalledWith(expect.any(File));
  });

  it('should not offer the controls to a member', () => {
    // Arrange
    renderPanel(asMember);

    // Assert
    expect(screen.queryByLabelText('Thêm ảnh nhóm')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Chọn ảnh đại diện nhóm')).not.toBeInTheDocument();
  });

  it('should offer the camera to the owner', () => {
    // Arrange
    renderPanel(asOwner);

    // Assert
    expect(screen.getByLabelText('Thêm ảnh nhóm')).toBeInTheDocument();
  });

  it('should say the camera changes the picture once one is set', () => {
    // Arrange
    renderPanel(asOwner, {}, groupOf(asOwner, true));

    // Assert
    expect(screen.getByLabelText('Đổi ảnh nhóm')).toBeInTheDocument();
  });

  it('should offer removal only once there is a picture to remove', async () => {
    // Arrange
    renderPanel(asOwner);

    // Assert
    expect(screen.queryByText('Xóa ảnh')).not.toBeInTheDocument();

    // Arrange again, this time with one set
    cleanup();
    const props = renderPanel(asOwner, {}, groupOf(asOwner, true));

    // Act
    await userEvent.click(screen.getByText('Xóa ảnh'));

    // Assert
    expect(props.onRemoveAvatar).toHaveBeenCalled();
  });

  it('should report a refused upload without closing the panel', async () => {
    // Arrange
    renderPanel(asOwner, {
      onPickAvatar: vi.fn().mockRejectedValue(new Error('Ảnh nhóm vượt quá 2 MiB')),
    });

    // Act
    await userEvent.upload(screen.getByLabelText('Chọn ảnh đại diện nhóm'), image());

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh nhóm vượt quá 2 MiB');
    expect(screen.getByText('Minh Anh')).toBeInTheDocument();
  });
});
