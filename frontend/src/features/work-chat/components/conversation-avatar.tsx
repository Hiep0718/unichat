/**
 * The face of a conversation, wherever one is shown.
 *
 * Three cases, in order of what the viewer learns from them: a group that has
 * had a picture set shows it, a group that has not shows a small stack of its
 * members, and a one-to-one conversation shows the other person.
 *
 * Lived inside the conversation list until the thread header needed the same
 * three cases; two copies would have meant a group with a picture in one place
 * and a stack of faces in the other.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { EntityAvatar } from '../../../components/entity-avatar';
import { loadGroupAvatar } from '../../../components/avatar-image-cache';
import type { ChatParticipant, Conversation } from '../work-chat-api';
import './conversation-avatar.css';

interface ConversationAvatarProps {
  readonly conversation: Conversation;
  readonly size?: number;
}

export function ConversationAvatar({ conversation, size = 36 }: ConversationAvatarProps) {
  const isGroup = conversation.kind === 'GROUP';
  const { id, hasAvatar } = conversation;
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isGroup || !hasAvatar) {
      // Clears a picture left over from the previously rendered conversation.
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    void loadGroupAvatar(id).then((url) => {
      // A failed load leaves the drawn fallback rather than a gap.
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [id, isGroup, hasAvatar]);

  if (imageUrl) {
    return (
      <img
        className="conversation-avatar__image"
        style={{ width: size, height: size }}
        src={imageUrl}
        alt=""
        aria-hidden="true"
      />
    );
  }

  if (!isGroup) {
    return <EntityAvatar name={conversation.title} size={size} shape="circle" />;
  }

  return <MemberStack participants={conversation.participants} size={size} />;
}

/**
 * A group with no picture, drawn as its members.
 *
 * Two faces at most: a row is not wide enough for more to be recognisable, and
 * the count says how many are behind them.
 */
function MemberStack({
  participants,
  size,
}: {
  readonly participants: readonly ChatParticipant[];
  readonly size: number;
}) {
  const others: ChatParticipant[] = participants
    .filter((participant) => !participant.me)
    .slice(0, 2);
  const face = Math.round(size * 0.72);

  return (
    <span
      className="conversation-avatar__stack"
      style={{ '--stack-face': `${face}px` } as CSSProperties}
      aria-hidden="true"
    >
      {others.map((participant) => (
        <EntityAvatar
          key={participant.userId}
          name={participant.name}
          size={face}
          shape="circle"
        />
      ))}
      {participants.length > 3 && (
        <span className="conversation-avatar__stack-more">+{participants.length - 3}</span>
      )}
    </span>
  );
}
