import { buildTimeline, dayLabel, mergeMessages } from '../../../src/features/messages/thread-timeline';

import type { CallHistoryEntry, DirectMessage } from '../../../src/features/messages/messages-api';
import type { CallsItem, MessageItem } from '../../../src/features/messages/thread-timeline';

const NOW = new Date(2026, 10, 8, 12, 0).getTime();

function message(id: string, at: Date, overrides: Partial<DirectMessage> = {}): DirectMessage {
  return {
    id,
    conversationId: 'c1',
    senderId: 'other',
    senderName: 'Phi Hung',
    body: id,
    mine: false,
    createdAt: at.toISOString(),
    attachments: [],
    ...overrides,
  };
}

function call(id: string, at: Date, overrides: Partial<CallHistoryEntry> = {}): CallHistoryEntry {
  return { id, outgoing: true, media: 'AUDIO', status: 'MISSED', startedAt: at.toISOString(), talkSeconds: 0, ...overrides };
}

describe('dayLabel', () => {
  it.each([
    [new Date(2026, 10, 8, 1, 0), 'Hôm nay'],
    [new Date(2026, 10, 7, 23, 0), 'Hôm qua'],
    [new Date(2026, 10, 4), '4 ngày trước'],
    [new Date(2026, 10, 1), '1 tuần trước'],
    [new Date(2026, 9, 18), '3 tuần trước'],
    [new Date(2026, 8, 23), '23 tháng 9'],
    [new Date(2025, 8, 23), '23 tháng 9, 2025'],
  ])('labels %s as %s', (date, expected) => {
    expect(dayLabel(date.getTime(), NOW)).toBe(expected);
  });
});

describe('mergeMessages', () => {
  it('drops duplicates by id and orders newest first', () => {
    const older = message('a', new Date(2026, 10, 1));
    const newer = message('b', new Date(2026, 10, 2));

    const merged = mergeMessages([older], [newer, older]);

    expect(merged.map((item) => item.id)).toEqual(['b', 'a']);
  });
});

describe('buildTimeline', () => {
  it('returns nothing for an empty conversation', () => {
    expect(buildTimeline([], [], NOW)).toEqual([]);
  });

  it('inserts a day chip only when the label changes', () => {
    const items = buildTimeline(
      [message('a', new Date(2026, 9, 17, 9)), message('b', new Date(2026, 9, 18, 9), { mine: true, senderId: 'me' })],
      [],
      NOW,
    );

    expect(items.filter((item) => item.kind === 'day')).toHaveLength(1);
  });

  it('shows the avatar on each message from the same sender when they fall on different days', () => {
    const items = buildTimeline([message('hi', new Date(2026, 8, 23)), message('hello', new Date(2026, 8, 28))], [], NOW);
    const messages = items.filter((item): item is MessageItem => item.kind === 'message');

    expect(messages.map((item) => item.showAvatar)).toEqual([true, true]);
  });

  it('shows the avatar only on the last message of a same-day run', () => {
    const items = buildTimeline(
      [message('a', new Date(2026, 10, 8, 9, 0)), message('b', new Date(2026, 10, 8, 9, 1))],
      [],
      NOW,
    );
    const messages = items.filter((item): item is MessageItem => item.kind === 'message');

    expect(messages.map((item) => item.showAvatar)).toEqual([false, true]);
  });

  it('collapses consecutive calls with the same outcome into one line', () => {
    const at = (minute: number) => new Date(2026, 9, 18, 23, minute);
    const items = buildTimeline(
      [],
      [call('1', at(50)), call('2', at(52)), call('3', at(55)), call('4', at(56), { outgoing: false })],
      NOW,
    );
    const calls = items.filter((item): item is CallsItem => item.kind === 'calls');

    expect(calls.map((item) => item.entries.length)).toEqual([3, 1]);
  });

  it('does not join calls separated by a message', () => {
    const items = buildTimeline(
      [message('between', new Date(2026, 10, 8, 9, 1))],
      [call('1', new Date(2026, 10, 8, 9, 0)), call('2', new Date(2026, 10, 8, 9, 2))],
      NOW,
    );

    expect(items.filter((item) => item.kind === 'calls')).toHaveLength(2);
  });

  it('marks only the final message as sent when the caller wrote it', () => {
    const mine = { mine: true, senderId: 'me' };
    const items = buildTimeline(
      [message('a', new Date(2026, 10, 8, 9), mine), message('b', new Date(2026, 10, 8, 10), mine)],
      [],
      NOW,
    );
    const messages = items.filter((item): item is MessageItem => item.kind === 'message');

    expect(messages.map((item) => item.showSent)).toEqual([false, true]);
  });

  it('does not mark a sent status when the other person wrote last', () => {
    const items = buildTimeline([message('a', new Date(2026, 10, 8, 9))], [], NOW);

    expect((items[1] as MessageItem).showSent).toBe(false);
  });
});
