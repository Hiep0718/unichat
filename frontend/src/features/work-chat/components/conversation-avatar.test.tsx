import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConversationAvatar } from './conversation-avatar';
import type { ChatParticipant, Conversation } from '../work-chat-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const loadGroupAvatar = vi.hoisted(() => vi.fn());

// A picture is fetched as a blob with a bearer token; the test supplies the
// URL rather than reaching the network for one.
vi.mock('../../../components/avatar-image-cache', () => ({
  loadAvatar: () => Promise.resolve(null),
  loadGroupAvatar,
}));

const members: ChatParticipant[] = [
  { userId: 'u1', name: 'Hùng', role: 'OWNER', me: true },
  { userId: 'u2', name: 'Minh Anh', role: 'MEMBER', me: false },
  { userId: 'u3', name: 'Lan', role: 'MEMBER', me: false },
  { userId: 'u4', name: 'Tú', role: 'MEMBER', me: false },
];

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    kind: 'GROUP',
    title: 'Nhóm đồ án',
    otherUserId: null,
    participants: members,
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    hasAvatar: false,
    ...overrides,
  };
}

describe('ConversationAvatar', () => {
  it('should show the picture a group has set', async () => {
    // Arrange
    loadGroupAvatar.mockResolvedValue('blob:nhom');

    // Act
    render(<ConversationAvatar conversation={conversation({ hasAvatar: true })} />);

    // Assert
    await waitFor(() =>
      expect(document.querySelector('.conversation-avatar__image'))
        .toHaveAttribute('src', 'blob:nhom'));
  });

  it('should not request a picture for a group that has none', () => {
    // Arrange: hasAvatar is what spares the list a request per row that would
    // only come back 404.
    loadGroupAvatar.mockClear();

    // Act
    render(<ConversationAvatar conversation={conversation()} />);

    // Assert
    expect(loadGroupAvatar).not.toHaveBeenCalled();
  });

  it('should fall back to the faces of a group with no picture', () => {
    // Act
    render(<ConversationAvatar conversation={conversation()} />);

    // Assert: two faces, and the count of everyone behind them.
    expect(document.querySelector('.conversation-avatar__stack')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('should keep the drawn fallback when the picture cannot be read', async () => {
    // Arrange: a gap where a face belongs is worse than the fallback.
    loadGroupAvatar.mockResolvedValue(null);

    // Act
    render(<ConversationAvatar conversation={conversation({ hasAvatar: true })} />);

    // Assert
    await waitFor(() =>
      expect(document.querySelector('.conversation-avatar__stack')).toBeInTheDocument());
    expect(document.querySelector('.conversation-avatar__image')).not.toBeInTheDocument();
  });

  it('should show the other person for a one-to-one conversation', () => {
    // Arrange: a picture here would be the other person's own, never the
    // conversation's.
    loadGroupAvatar.mockClear();

    // Act
    render(
      <ConversationAvatar
        conversation={conversation({ kind: 'DIRECT', title: 'Minh Anh', hasAvatar: true })}
      />,
    );

    // Assert
    expect(loadGroupAvatar).not.toHaveBeenCalled();
    expect(screen.getByText('M')).toBeInTheDocument();
  });
});
