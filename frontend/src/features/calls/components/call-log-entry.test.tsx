import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CallLogEntry } from './call-log-entry';

import type { CallHistoryEntryDto } from '../call-api';

const BASE: CallHistoryEntryDto = {
  id: 'call-1',
  outgoing: true,
  media: 'AUDIO',
  status: 'ENDED',
  startedAt: '2026-10-20T09:30:00Z',
  talkSeconds: 134,
};

const entry = (overrides: Partial<CallHistoryEntryDto> = {}): CallHistoryEntryDto => ({
  ...BASE,
  ...overrides,
});

describe('CallLogEntry', () => {
  it('should say which way an answered call went, and how long it lasted', () => {
    render(<CallLogEntry entry={entry()} />);

    expect(screen.getByText('Cuộc gọi đi')).toBeInTheDocument();
    expect(screen.getByText('2:14')).toBeInTheDocument();
  });

  it('should pad the seconds so durations line up in a column', () => {
    render(<CallLogEntry entry={entry({ talkSeconds: 65 })} />);

    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('should not offer a duration for a call nobody answered', () => {
    // talkSeconds is zero for these, and "0:00" alongside "Cuộc gọi nhỡ"
    // reads as a call that connected and said nothing.
    render(<CallLogEntry entry={entry({ status: 'MISSED', outgoing: false, talkSeconds: 0 })} />);

    expect(screen.getByText('Cuộc gọi nhỡ')).toBeInTheDocument();
    expect(screen.queryByText('0:00')).not.toBeInTheDocument();
  });

  it('should word a missed call from the reader side', () => {
    const { rerender } = render(
      <CallLogEntry entry={entry({ status: 'MISSED', outgoing: true, talkSeconds: 0 })} />,
    );
    expect(screen.getByText('Cuộc gọi không trả lời')).toBeInTheDocument();

    rerender(<CallLogEntry entry={entry({ status: 'MISSED', outgoing: false, talkSeconds: 0 })} />);
    expect(screen.getByText('Cuộc gọi nhỡ')).toBeInTheDocument();
  });

  it('should colour only a missed incoming call', () => {
    // The one line that may still need something from the reader. Colouring
    // the rest would spend attention on pure history.
    const { rerender } = render(
      <CallLogEntry entry={entry({ status: 'MISSED', outgoing: false, talkSeconds: 0 })} />,
    );
    expect(screen.getByTestId('call-log-entry')).toHaveClass('call-log--missed');

    rerender(<CallLogEntry entry={entry({ status: 'MISSED', outgoing: true, talkSeconds: 0 })} />);
    expect(screen.getByTestId('call-log-entry')).not.toHaveClass('call-log--missed');

    rerender(<CallLogEntry entry={entry()} />);
    expect(screen.getByTestId('call-log-entry')).not.toHaveClass('call-log--missed');
  });

  it('should distinguish a refusal from a call nobody picked up', () => {
    const { rerender } = render(
      <CallLogEntry entry={entry({ status: 'DECLINED', outgoing: true, talkSeconds: 0 })} />,
    );
    expect(screen.getByText('Cuộc gọi bị từ chối')).toBeInTheDocument();

    rerender(
      <CallLogEntry entry={entry({ status: 'DECLINED', outgoing: false, talkSeconds: 0 })} />,
    );
    expect(screen.getByText('Bạn đã từ chối')).toBeInTheDocument();
  });

  it('should name a connection failure as one rather than as a missed call', () => {
    render(<CallLogEntry entry={entry({ status: 'FAILED', talkSeconds: 0 })} />);

    expect(screen.getByText('Cuộc gọi lỗi kết nối')).toBeInTheDocument();
  });
});
