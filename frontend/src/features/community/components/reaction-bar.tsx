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
  /** Smaller pill, for a card's footer. */
  readonly compact?: boolean;
  /**
   * `link` draws the trigger as a word in a comment's meta line ("Thích"),
   * the way a comment's actions read on Facebook, and moves the tally to the
   * end of that line. `pill` is the bordered button used on posts.
   */
  readonly variant?: 'pill' | 'link';
}

/**
 * Display order and labels, matching ReactionSummary.displayOrder on the
 * server. The set and its order are Facebook's, so nobody has to learn them.
 */
const REACTIONS: readonly { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'LIKE', emoji: '👍', label: 'Thích' },
  { type: 'LOVE', emoji: '❤️', label: 'Yêu thích' },
  { type: 'CARE', emoji: '🥰', label: 'Thương thương' },
  { type: 'HAHA', emoji: '😆', label: 'Haha' },
  { type: 'WOW', emoji: '😮', label: 'Wow' },
  { type: 'SAD', emoji: '😢', label: 'Buồn' },
  { type: 'ANGRY', emoji: '😠', label: 'Phẫn nộ' },
];

const EMOJI: Record<ReactionType, string> = Object.fromEntries(
  REACTIONS.map((reaction) => [reaction.type, reaction.emoji]),
) as Record<ReactionType, string>;

/**
 * What the trigger says.
 *
 * Unreacted, a compact or link trigger says "Thích" rather than showing a bare
 * add-reaction icon: an icon with no words had no accessible name, and next
 * to a "👍 1" tally it read as a second, empty reaction.
 */
function TriggerContent({ mine, compact, variant }: {
  readonly mine: ReactionType | null;
  readonly compact: boolean;
  readonly variant: 'pill' | 'link';
}) {
  const label = REACTIONS.find((r) => r.type === mine)?.label;
  if (variant === 'link') return <>{label ?? 'Thích'}</>;
  if (mine) {
    return (
      <>
        <span aria-hidden="true">{EMOJI[mine]}</span>
        {label}
      </>
    );
  }
  if (compact) {
    return (
      <>
        <Icon name="thumb_up" size={16} />
        Thích
      </>
    );
  }
  return (
    <>
      <Icon name="add_reaction" size={17} />
      Bày tỏ cảm xúc
    </>
  );
}

export function ReactionBar({
  targetType,
  targetId,
  summary,
  compact = false,
  variant = 'pill',
}: ReactionBarProps) {
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
    <div className={`reaction-bar reaction-bar--${variant} ${compact ? 'reaction-bar--compact' : ''}`}>
      <div className="reaction-bar__trigger-wrap">
        <button
          type="button"
          className={`reaction-bar__trigger ${mine ? 'reaction-bar__trigger--mine' : ''}`}
          onClick={() => setPickerOpen((open) => !open)}
          disabled={saving}
          aria-haspopup="menu"
          aria-expanded={pickerOpen}
        >
          <TriggerContent mine={mine} compact={compact} variant={variant} />
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
