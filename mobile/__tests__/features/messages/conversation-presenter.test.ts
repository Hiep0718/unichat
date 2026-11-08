import {
  filterConversations,
  formatListTime,
  othersOf,
  previewOf,
  totalUnread,
} from '../../../src/features/messages/conversation-presenter';

import type { Conversation } from '../../../src/features/messages/messages-api';

const NOW = new Date(2026, 10, 8, 12, 0).getTime();

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    kind: 'DIRECT',
    title: 'Phi Hùng',
    otherUserId: 'u2',
    participants: [
      { userId: 'u1', name: 'Tôi', role: 'MEMBER', me: true },
      { userId: 'u2', name: 'Phi Hùng', role: 'MEMBER', me: false },
    ],
    lastMessage: 'hi',
    lastMessageAt: new Date(2026, 10, 1).toISOString(),
    unreadCount: 0,
    hasAvatar: false,
    ...overrides,
  };
}

describe('formatListTime', () => {
  it.each([
    [new Date(2026, 10, 8, 11, 59, 40), 'Vừa xong'],
    [new Date(2026, 10, 8, 9, 5), '09:05'],
    [new Date(2026, 10, 7, 9, 0), 'Hôm qua'],
    [new Date(2026, 10, 4, 12, 0), '4 ngày'],
    [new Date(2026, 10, 1, 12, 0), '1 tuần'],
    [new Date(2026, 8, 23, 12, 0), '23/9'],
  ])('formats %s as %s', (date, expected) => {
    expect(formatListTime(date.toISOString(), NOW)).toBe(expected);
  });
});

describe('conversation helpers', () => {
  it('falls back to a prompt when nobody has written yet', () => {
    expect(previewOf(conversation({ lastMessage: null }))).toBe('Chưa có tin nhắn');
    expect(previewOf(conversation({ lastMessage: '  hello ' }))).toBe('hello');
  });

  it('lists everyone except the caller', () => {
    expect(othersOf(conversation()).map((p) => p.userId)).toEqual(['u2']);
  });

  it('sums unread counts and tolerates a list that has not loaded', () => {
    expect(totalUnread([conversation({ unreadCount: 2 }), conversation({ unreadCount: 3 })])).toBe(5);
    expect(totalUnread(undefined)).toBe(0);
  });
});

describe('filterConversations', () => {
  const list = [
    conversation(),
    conversation({ id: 'g', kind: 'GROUP', title: 'Nhóm vip', participants: [
      { userId: 'u3', name: 'Lan Anh', role: 'OWNER', me: false },
    ] }),
  ];

  it('returns everything for a blank query', () => {
    expect(filterConversations(list, '  ')).toHaveLength(2);
  });

  it('matches titles without caring about diacritics or case', () => {
    expect(filterConversations(list, 'phi hung').map((c) => c.id)).toEqual(['c1']);
  });

  it('matches a member name inside a group', () => {
    expect(filterConversations(list, 'lan').map((c) => c.id)).toEqual(['g']);
  });
});
