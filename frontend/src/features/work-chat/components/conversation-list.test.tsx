import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConversationList } from './conversation-list';
import type { Conversation } from '../work-chat-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'c1',
  otherUserId: 'u2',
  otherUserName: 'bob',
  lastMessage: 'Chào bạn nhé',
  lastMessageAt: new Date().toISOString(),
  unreadCount: 0,
  ...overrides,
});

describe('ConversationList', () => {
  it('should invite the first conversation when there are none', () => {
    // Arrange and Act
    render(<ConversationList conversations={[]} activeId={null} onSelect={() => {}} />);

    // Assert
    expect(screen.getByText(/Chưa có cuộc trò chuyện nào/)).toBeInTheDocument();
  });

  it('should show the other person and a preview of the last message', () => {
    // Arrange and Act
    render(
      <ConversationList
        conversations={[conversation()]}
        activeId={null}
        onSelect={() => {}}
      />,
    );

    // Assert
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('Chào bạn nhé')).toBeInTheDocument();
  });

  it('should say so plainly when a conversation has no messages yet', () => {
    // Arrange and Act
    render(
      <ConversationList
        conversations={[conversation({ lastMessage: null, lastMessageAt: null })]}
        activeId={null}
        onSelect={() => {}}
      />,
    );

    // Assert
    expect(screen.getByText('Chưa có tin nhắn')).toBeInTheDocument();
  });

  it('should show an unread count so a waiting message is not missed', () => {
    // Arrange and Act
    render(
      <ConversationList
        conversations={[conversation({ unreadCount: 4 })]}
        activeId={null}
        onSelect={() => {}}
      />,
    );

    // Assert
    expect(screen.getByLabelText('Tin chưa đọc')).toHaveTextContent('4');
  });

  it('should not show an unread badge when everything has been read', () => {
    // Arrange and Act
    render(
      <ConversationList
        conversations={[conversation({ unreadCount: 0 })]}
        activeId={null}
        onSelect={() => {}}
      />,
    );

    // Assert
    expect(screen.queryByLabelText('Tin chưa đọc')).not.toBeInTheDocument();
  });

  it('should mark the open conversation for assistive technology', () => {
    // Arrange and Act
    render(
      <ConversationList
        conversations={[conversation()]}
        activeId="c1"
        onSelect={() => {}}
      />,
    );

    // Assert
    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true');
  });

  it('should open the conversation that was clicked', async () => {
    // Arrange
    const onSelect = vi.fn();
    render(
      <ConversationList
        conversations={[conversation()]}
        activeId={null}
        onSelect={onSelect}
      />,
    );

    // Act
    await userEvent.click(screen.getByRole('button'));

    // Assert
    expect(onSelect).toHaveBeenCalledWith('c1');
  });
});
