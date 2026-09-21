import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MessageThread } from './message-thread';
import type { Conversation, DirectMessage } from '../work-chat-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const conversation: Conversation = {
  id: 'c1',
  otherUserId: 'u2',
  otherUserName: 'bob',
  lastMessage: null,
  lastMessageAt: null,
  unreadCount: 0,
};

const message = (overrides: Partial<DirectMessage> = {}): DirectMessage => ({
  id: 'm1',
  conversationId: 'c1',
  senderId: 'u2',
  senderName: 'bob',
  body: 'Chào bạn',
  mine: false,
  createdAt: new Date().toISOString(),
  readAt: null,
  ...overrides,
});

describe('MessageThread', () => {
  it('should invite the first message in an empty conversation', () => {
    // Arrange and Act
    render(
      <MessageThread
        conversation={conversation}
        messages={[]}
        onSend={async () => {}}
      />,
    );

    // Assert
    expect(screen.getByText(/Chưa có tin nhắn/)).toBeInTheDocument();
  });

  it('should show oldest first, since the server returns newest first', () => {
    // Arrange
    const older = message({ id: 'm1', body: 'Tin cũ' });
    const newer = message({ id: 'm2', body: 'Tin mới' });

    // Act: the server order is newest-first.
    render(
      <MessageThread
        conversation={conversation}
        messages={[newer, older]}
        onSend={async () => {}}
      />,
    );

    // Assert
    const bodies = screen.getAllByText(/^Tin /).map((node) => node.textContent);
    expect(bodies).toEqual(['Tin cũ', 'Tin mới']);
  });

  it('should send what was typed and then clear the box', async () => {
    // Arrange
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <MessageThread conversation={conversation} messages={[]} onSend={onSend} />,
    );
    const input = screen.getByLabelText('Nội dung tin nhắn');

    // Act
    await userEvent.type(input, 'xin chào');
    await userEvent.click(screen.getByLabelText('Gửi'));

    // Assert
    expect(onSend).toHaveBeenCalledWith('xin chào');
    expect(input).toHaveValue('');
  });

  it('should refuse to send a message that is only whitespace', async () => {
    // Arrange
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <MessageThread conversation={conversation} messages={[]} onSend={onSend} />,
    );

    // Act
    await userEvent.type(screen.getByLabelText('Nội dung tin nhắn'), '   ');

    // Assert
    expect(screen.getByLabelText('Gửi')).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('should keep the draft when sending fails, rather than losing what was typed', async () => {
    // Arrange
    const onSend = vi.fn().mockRejectedValue(new Error('offline'));
    render(
      <MessageThread conversation={conversation} messages={[]} onSend={onSend} />,
    );
    const input = screen.getByLabelText('Nội dung tin nhắn');

    // Act
    await userEvent.type(input, 'tin quan trọng');
    await userEvent.click(screen.getByLabelText('Gửi'));

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(/Không gửi được/);
    expect(input).toHaveValue('tin quan trọng');
  });

  it('should name the person being talked to', () => {
    // Arrange and Act
    render(
      <MessageThread
        conversation={conversation}
        messages={[message()]}
        onSend={async () => {}}
      />,
    );

    // Assert
    expect(screen.getByRole('heading', { name: 'bob' })).toBeInTheDocument();
  });
});
