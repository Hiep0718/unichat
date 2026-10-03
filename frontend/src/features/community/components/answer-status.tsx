/**
 * Resolution state of a question — the single most useful signal in the feed.
 *
 * A reader scanning the list wants to know whether a question still needs help
 * before anything else, so this leads every card rather than the vote score.
 */
import { Icon } from '../../../components/icon';
import './answer-status.css';

export type AnswerStatus = 'UNANSWERED' | 'DISCUSSING' | 'RESOLVED';

interface AnswerStatusProps {
  readonly replyCount: number;
  readonly hasAcceptedAnswer: boolean;
  /** Compact rail form used on feed cards; omit for the labelled pill. */
  readonly compact?: boolean;
}

const STATUS_META: Record<
  AnswerStatus,
  { label: string; icon: string; short: string }
> = {
  UNANSWERED: { label: 'Chưa có lời giải', icon: 'help', short: 'Chưa giải' },
  DISCUSSING: { label: 'Đang thảo luận', icon: 'forum', short: 'Đang bàn' },
  RESOLVED: { label: 'Đã giải đáp', icon: 'check_circle', short: 'Đã giải' },
};

/**
 * Derives the state from the counters the feed already returns.
 */
export function resolveAnswerStatus(
  replyCount: number,
  hasAcceptedAnswer: boolean
): AnswerStatus {
  if (hasAcceptedAnswer) return 'RESOLVED';
  return replyCount > 0 ? 'DISCUSSING' : 'UNANSWERED';
}

export function AnswerStatusBadge({
  replyCount,
  hasAcceptedAnswer,
  compact = false,
}: AnswerStatusProps) {
  const status = resolveAnswerStatus(replyCount, hasAcceptedAnswer);
  const meta = STATUS_META[status];

  if (compact) {
    return (
      <span
        className={`answer-status answer-status--rail answer-status--${status.toLowerCase()}`}
        title={meta.label}
      >
        <Icon name={meta.icon} size={20} />
        <span className="answer-status__count">{replyCount}</span>
      </span>
    );
  }

  return (
    <span className={`answer-status answer-status--pill answer-status--${status.toLowerCase()}`}>
      <Icon name={meta.icon} size={14} />
      {meta.label}
    </span>
  );
}
