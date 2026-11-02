import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MessageThread } from './message-thread';
import type { Conversation, DirectMessage } from '../work-chat-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const conversation: Conversation = {
  id: 'c1',
  kind: 'DIRECT',
  title: 'bob',
  otherUserId: 'u2',
  participants: [
    { userId: 'u1', name: 'tôi', role: 'MEMBER', me: true },
    { userId: 'u2', name: 'bob', role: 'MEMBER', me: false },
  ],
  lastMessage: null,
  lastMessageAt: null,
  unreadCount: 0,
  hasAvatar: false,
};

const groupConversation: Conversation = {
  ...conversation,
  kind: 'GROUP',
  title: 'Nhóm đồ án',
  otherUserId: null,
  participants: [
    { userId: 'u1', name: 'tôi', role: 'OWNER', me: true },
    { userId: 'u2', name: 'bob', role: 'MEMBER', me: false },
    { userId: 'u3', name: 'carol', role: 'MEMBER', me: false },
  ],
};

const message = (overrides: Partial<DirectMessage> = {}): DirectMessage => ({
  id: 'm1',
  conversationId: 'c1',
  senderId: 'u2',
  senderName: 'bob',
  body: 'Chào bạn',
  mine: false,
  createdAt: new Date().toISOString(),
  attachments: [],
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
        onToggleSettings={() => {}}
          settingsOpen={false}
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
        onToggleSettings={() => {}}
          settingsOpen={false}
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
      <MessageThread
        conversation={conversation}
        messages={[]}
        onSend={onSend}
        onToggleSettings={() => {}}
          settingsOpen={false}
      />,
    );
    const input = screen.getByLabelText('Nội dung tin nhắn');

    // Act
    await userEvent.type(input, 'xin chào');
    await userEvent.click(screen.getByLabelText('Gửi'));

    // Assert
    expect(onSend).toHaveBeenCalledWith('xin chào', [], expect.any(Function));
    expect(input).toHaveValue('');
  });

  it('should refuse to send a message that is only whitespace', async () => {
    // Arrange
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <MessageThread
        conversation={conversation}
        messages={[]}
        onSend={onSend}
        onToggleSettings={() => {}}
          settingsOpen={false}
      />,
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
      <MessageThread
        conversation={conversation}
        messages={[]}
        onSend={onSend}
        onToggleSettings={() => {}}
          settingsOpen={false}
      />,
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
        onToggleSettings={() => {}}
          settingsOpen={false}
      />,
    );

    // Assert
    expect(screen.getByRole('heading', { name: 'bob' })).toBeInTheDocument();
  });

  it('should name other people in a group, where there is more than one', () => {
    // Arrange and Act
    render(
      <MessageThread
        conversation={groupConversation}
        messages={[message({ senderName: 'carol' })]}
        onSend={async () => {}}
        onToggleSettings={() => {}}
          settingsOpen={false}
      />,
    );

    // Assert
    expect(screen.getByText('carol')).toBeInTheDocument();
  });

  it('should not name the sender in a one-to-one thread', () => {
    // Arrange and Act: there is only one other person, so repeating their name
    // on every bubble is noise.
    render(
      <MessageThread
        conversation={conversation}
        messages={[message({ senderName: 'bob' })]}
        onSend={async () => {}}
        onToggleSettings={() => {}}
          settingsOpen={false}
      />,
    );

    // Assert: the heading names them once, and nothing else does.
    expect(screen.getAllByText('bob')).toHaveLength(1);
  });

  it('should let a group hide the settings panel that starts open', async () => {
    // Arrange: the panel is open by default, so the button's job is to take
    // the width back rather than to go and fetch it.
    const onToggleSettings = vi.fn();
    render(
      <MessageThread
        conversation={groupConversation}
        messages={[]}
        onSend={async () => {}}
        onToggleSettings={onToggleSettings}
        settingsOpen
      />,
    );

    // Act
    await userEvent.click(screen.getByLabelText('Ẩn cài đặt nhóm'));

    // Assert
    expect(onToggleSettings).toHaveBeenCalled();
  });

  it('should offer to bring the panel back once it is closed', async () => {
    // Arrange
    const onToggleSettings = vi.fn();
    render(
      <MessageThread
        conversation={groupConversation}
        messages={[]}
        onSend={async () => {}}
        onToggleSettings={onToggleSettings}
        settingsOpen={false}
      />,
    );

    // Act
    await userEvent.click(screen.getByLabelText('Hiện cài đặt nhóm'));

    // Assert
    expect(onToggleSettings).toHaveBeenCalled();
  });

  it('should not offer a member list in a one-to-one thread', () => {
    // Arrange and Act
    render(
      <MessageThread
        conversation={conversation}
        messages={[]}
        onSend={async () => {}}
        onToggleSettings={() => {}}
          settingsOpen={false}
      />,
    );

    // Assert
    expect(screen.queryByLabelText('Xem thành viên nhóm')).not.toBeInTheDocument();
  });
});
