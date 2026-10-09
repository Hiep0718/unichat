import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GroupMembersPanel } from './group-members-panel';
import type { ChatParticipant } from '../work-chat-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const asOwner: ChatParticipant[] = [
  { userId: 'u1', name: 'Hùng', role: 'OWNER', me: true },
  { userId: 'u2', name: 'Minh Anh', role: 'MEMBER', me: false },
];

const asMember: ChatParticipant[] = [
  { userId: 'u1', name: 'Hùng', role: 'OWNER', me: false },
  { userId: 'u2', name: 'Minh Anh', role: 'MEMBER', me: true },
];

function renderPanel(
  participants: ChatParticipant[],
  overrides: Partial<Record<'onAdd' | 'onRemove' | 'onLeave', () => Promise<void>>> = {},
) {
  const props = {
    title: 'Nhóm đồ án',
    participants,
    onAdd: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onLeave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<GroupMembersPanel {...props} />);
  return props;
}

describe('GroupMembersPanel', () => {
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
