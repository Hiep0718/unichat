/**
 * Reactions on a post or reply.
 *
 * Shows which reactions people left and lets the reader add one of their own.
 * A member holds at most one reaction per target: picking a different one
 * replaces it, picking the same one removes it.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import { toggleReaction } from '../community-api';
import type { ReactionSummary, ReactionType } from '../community-api';
import './reaction-bar.css';

interface ReactionBarProps {
  readonly targetType: 'DISCUSSION' | 'DISCUSSION_REPLY';
  readonly targetId: string;
  readonly summary: ReactionSummary;
  /** Smaller variant used inside reply threads. */
  readonly compact?: boolean;
}

/** Display order and labels, matching ReactionSummary.displayOrder on the server. */
const REACTIONS: readonly { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'LIKE', emoji: '👍', label: 'Thích' },
  { type: 'LOVE', emoji: '❤️', label: 'Yêu thích' },
  { type: 'INSIGHTFUL', emoji: '💡', label: 'Sâu sắc' },
  { type: 'CELEBRATE', emoji: '🎉', label: 'Chúc mừng' },
];

const EMOJI: Record<ReactionType, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  INSIGHTFUL: '💡',
  CELEBRATE: '🎉',
};

export function ReactionBar({ targetType, targetId, summary, compact = false }: ReactionBarProps) {
  const [current, setCurrent] = useState<ReactionSummary>(summary);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const apply = async (type: ReactionType) => {
    if (saving) return;
    setPickerOpen(false);
    setSaving(true);
    setFailed(false);
    try {
      setCurrent(await toggleReaction({ targetType, targetId, reactionType: type }));
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const used = REACTIONS.filter((r) => (current.counts[r.type] ?? 0) > 0);
  const mine = current.myReaction;

  return (
    <div className={`reaction-bar ${compact ? 'reaction-bar--compact' : ''}`}>
      <div className="reaction-bar__trigger-wrap">
        <button
          type="button"
          className={`reaction-bar__trigger ${mine ? 'reaction-bar__trigger--mine' : ''}`}
          onClick={() => setPickerOpen((open) => !open)}
          disabled={saving}
          aria-haspopup="menu"
          aria-expanded={pickerOpen}
        >
          {mine ? (
            <>
              <span aria-hidden="true">{EMOJI[mine]}</span>
              {REACTIONS.find((r) => r.type === mine)?.label}
            </>
          ) : (
            <>
              <Icon name="add_reaction" size={compact ? 15 : 17} />
              {!compact && 'Bày tỏ cảm xúc'}
            </>
          )}
        </button>

        {pickerOpen && (
          <>
            <div className="reaction-bar__backdrop" onClick={() => setPickerOpen(false)} />
            <div className="reaction-bar__picker" role="menu">
              {REACTIONS.map((reaction) => (
                <button
                  key={reaction.type}
                  type="button"
                  role="menuitem"
                  className={`reaction-bar__option ${mine === reaction.type ? 'reaction-bar__option--mine' : ''}`}
                  onClick={() => apply(reaction.type)}
                  title={reaction.label}
                >
                  <span aria-hidden="true">{reaction.emoji}</span>
                  <span className="reaction-bar__option-label">{reaction.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {used.length > 0 && (
        <span
          className="reaction-bar__tally"
          title={used.map((r) => `${r.label}: ${current.counts[r.type]}`).join(' · ')}
        >
          <span className="reaction-bar__emojis" aria-hidden="true">
            {used.map((r) => (
              <span key={r.type}>{r.emoji}</span>
            ))}
          </span>
          {current.total}
        </span>
      )}

      {failed && (
        <span className="reaction-bar__error" role="alert">
          Không lưu được
        </span>
      )}
    </div>
  );
}
