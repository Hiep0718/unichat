/**
 * One-way "helpful" signal, replacing up/down voting.
 *
 * Downvotes are corrosive in a group where everyone knows each other, and with
 * a class-sized community the numbers are too small to rank anything anyway.
 * A positive-only signal still surfaces good answers without the social cost.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import { toggleReaction } from '../community-api';
import './helpful-button.css';

interface HelpfulButtonProps {
  readonly targetType: 'DISCUSSION' | 'DISCUSSION_REPLY';
  readonly targetId: string;
  readonly initialScore: number;
  readonly initialVote: string | null;
  /** Smaller variant used inside reply threads. */
  readonly compact?: boolean;
}

export function HelpfulButton({
  targetType,
  targetId,
  initialScore,
  initialVote,
  compact = false,
}: HelpfulButtonProps) {
  // A pre-existing downvote still counts against the stored score; treat only
  // an explicit upvote as "marked helpful".
  const [count, setCount] = useState(Math.max(initialScore, 0));
  const [marked, setMarked] = useState(initialVote === 'UPVOTE');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaving) return;

    const previousCount = count;
    const previousMarked = marked;

    setCount(marked ? Math.max(count - 1, 0) : count + 1);
    setMarked(!marked);
    setIsSaving(true);
    setError(false);

    try {
      await toggleReaction({ targetType, targetId, reactionType: 'UPVOTE' });
    } catch {
      setCount(previousCount);
      setMarked(previousMarked);
      setError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      type="button"
      className={`helpful-btn ${marked ? 'helpful-btn--marked' : ''} ${compact ? 'helpful-btn--compact' : ''}`}
      onClick={handleToggle}
      disabled={isSaving}
      aria-pressed={marked}
      title={error ? 'Không lưu được, thử lại' : marked ? 'Bỏ đánh dấu hữu ích' : 'Đánh dấu là hữu ích'}
    >
      <Icon name={marked ? 'thumb_up' : 'thumb_up_off_alt'} size={compact ? 15 : 17} />
      <span className="helpful-btn__label">Hữu ích</span>
      {count > 0 && <span className="helpful-btn__count">{count}</span>}
    </button>
  );
}
