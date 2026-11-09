import {
  callIcon,
  callNeedsAttention,
  describeCall,
  formatClock,
  formatTalkTime,
} from '../../../src/features/messages/call-log';
import { callSummary } from '../../../src/features/messages/components/thread-items';

import type { CallHistoryEntry } from '../../../src/features/messages/messages-api';

function entry(overrides: Partial<CallHistoryEntry>): CallHistoryEntry {
  return {
    id: 'call',
    outgoing: true,
    media: 'AUDIO',
    status: 'ENDED',
    startedAt: new Date(2026, 10, 8, 0, 3).toISOString(),
    talkSeconds: 32,
    ...overrides,
  };
}

describe('describeCall', () => {
  it.each([
    [{ status: 'ENDED', outgoing: true }, 'Cuộc gọi đi'],
    [{ status: 'ENDED', outgoing: false }, 'Cuộc gọi đến'],
    [{ status: 'DECLINED', outgoing: true }, 'Cuộc gọi bị từ chối'],
    [{ status: 'DECLINED', outgoing: false }, 'Bạn đã từ chối'],
    [{ status: 'FAILED', outgoing: true }, 'Cuộc gọi lỗi kết nối'],
    [{ status: 'MISSED', outgoing: true }, 'Cuộc gọi không trả lời'],
    [{ status: 'MISSED', outgoing: false }, 'Cuộc gọi nhỡ'],
  ] as const)('describes %o as %s', (overrides, expected) => {
    expect(describeCall(entry(overrides))).toBe(expected);
  });
});

describe('call presentation', () => {
  it('flags only a missed incoming call as needing attention', () => {
    expect(callNeedsAttention(entry({ status: 'MISSED', outgoing: false }))).toBe(true);
    expect(callNeedsAttention(entry({ status: 'MISSED', outgoing: true }))).toBe(false);
  });

  it('picks an icon by direction and outcome', () => {
    expect(callIcon(entry({ outgoing: true }))).toBe('call-made');
    expect(callIcon(entry({ outgoing: false }))).toBe('call-received');
    expect(callIcon(entry({ status: 'MISSED' }))).toBe('call-missed');
  });

  it('formats talk time and clock time', () => {
    expect(formatTalkTime(32)).toBe('0:32');
    expect(formatTalkTime(125)).toBe('2:05');
    expect(formatTalkTime(-4)).toBe('0:00');
    expect(formatClock(new Date(2026, 10, 8, 23, 5).toISOString())).toBe('23:05');
  });
});

describe('callSummary', () => {
  it('shows talk time and clock for one answered call', () => {
    expect(callSummary([entry({})])).toEqual({ label: 'Cuộc gọi đi', detail: '0:32 · 00:03' });
  });

  it('counts a run of unanswered calls and shows the latest time', () => {
    const at = (minute: number) => new Date(2026, 10, 8, 23, minute).toISOString();
    const missed = [50, 52, 55].map((minute) => entry({ status: 'MISSED', startedAt: at(minute), talkSeconds: 0 }));

    expect(callSummary(missed)).toEqual({ label: '3 cuộc gọi không trả lời', detail: '23:55' });
  });
});
