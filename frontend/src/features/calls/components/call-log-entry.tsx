/**
 * A call, shown in the conversation it belonged to.
 *
 * A call leaves the same kind of trace a message does — it happened, at a
 * time, between these two people — so it belongs in the thread rather than
 * in a panel of its own. Until this existed a call vanished the moment it
 * ended, and the only record of it was a row nobody could see.
 *
 * Centred rather than sided like a bubble: a call is an event in the
 * conversation, not something one of the two said.
 */
import { Icon } from '../../../components/icon';

import './call-log-entry.css';

import type { CallHistoryEntryDto } from '../call-api';

/** What the line says, from the reader's side of the call. */
function describe(entry: CallHistoryEntryDto): string {
  if (entry.status === 'ENDED') {
    return entry.outgoing ? 'Cuộc gọi đi' : 'Cuộc gọi đến';
  }
  if (entry.status === 'DECLINED') {
    return entry.outgoing ? 'Cuộc gọi bị từ chối' : 'Bạn đã từ chối';
  }
  if (entry.status === 'FAILED') {
    return 'Cuộc gọi lỗi kết nối';
  }
  // MISSED covers nobody answering, the callee being offline and the callee
  // being busy. From the reader's side only the direction changes the wording.
  return entry.outgoing ? 'Cuộc gọi không trả lời' : 'Cuộc gọi nhỡ';
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/** A missed incoming call is the one a reader may still need to act on. */
function needsAttention(entry: CallHistoryEntryDto): boolean {
  return entry.status === 'MISSED' && !entry.outgoing;
}

interface CallLogEntryProps {
  readonly entry: CallHistoryEntryDto;
}

export function CallLogEntry({ entry }: CallLogEntryProps) {
  const answered = entry.status === 'ENDED';

  return (
    <div
      className={`call-log ${needsAttention(entry) ? 'call-log--missed' : ''}`}
      data-testid="call-log-entry"
    >
      <span className="call-log__icon" aria-hidden="true">
        <Icon
          name={answered ? (entry.outgoing ? 'call_made' : 'call_received') : 'call_missed'}
          size={16}
        />
      </span>

      <span className="call-log__text">{describe(entry)}</span>

      {answered && entry.talkSeconds > 0 && (
        <span className="call-log__duration">{formatDuration(entry.talkSeconds)}</span>
      )}

      <time className="call-log__time" dateTime={entry.startedAt}>
        {formatTime(entry.startedAt)}
      </time>
    </div>
  );
}
