/**
 * One comment: a face, a bubble holding the name and the words, and a single
 * quiet line of actions under it.
 *
 * The actions used to be a row of outlined buttons under every comment — an
 * empty reaction box, a count, "Trả lời" — so seven comments drew seven rows
 * that outweighed the comments themselves. They are words now ("Thích",
 * "Trả lời"), and the reaction tally only appears when there is one.
 */
import { EntityAvatar } from '../../../components/entity-avatar';
import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';
import { CollapsibleBody } from './collapsible-body';
import { MentionText } from './mention-text';
import { ReactionBar } from './reaction-bar';
import { ReplyCitations } from './reply-citations';

import type { ReplyResponse } from '../community-api';

import './reply-node.css';

interface ReplyNodeProps {
  readonly reply: ReplyResponse;
  readonly isAccepted: boolean;
  /** Present only for the asker, who alone may settle the question. */
  readonly onAccept?: (() => void) | undefined;
  readonly onReply: () => void;
  /** Smaller face for replies inside a thread. */
  readonly nested: boolean;
}

/** The face beside a comment: the assistant's mark, or the author's avatar. */
function ReplyAvatar({ reply, size }: { readonly reply: ReplyResponse; readonly size: number }) {
  if (reply.isAiAnswer) {
    return (
      <span className="reply-node__ai-mark" style={{ width: size, height: size }} aria-hidden="true">
        <Icon name="smart_toy" size={Math.round(size * 0.55)} />
      </span>
    );
  }
  // The picture when the author uploaded one; otherwise their initial on the
  // colour they chose, or one derived from the name — so three people who
  // share a first letter no longer look like the same grey "H".
  return (
    <EntityAvatar
      name={reply.authorName || '?'}
      userId={reply.authorId}
      hasAvatar={reply.authorHasAvatar ?? false}
      avatarColor={reply.authorAvatarColor ?? null}
      size={size}
      shape="circle"
    />
  );
}

export function ReplyNode({ reply, isAccepted, onAccept, onReply, nested }: ReplyNodeProps) {
  const classes = [
    'reply-node',
    reply.isAiAnswer ? 'reply-node--ai' : '',
    isAccepted ? 'reply-node--accepted' : '',
  ].join(' ');

  return (
    <div className={classes}>
      <ReplyAvatar reply={reply} size={nested ? 26 : 32} />
      <div className="reply-node__content">
        {isAccepted && (
          <span className="reply-node__accepted-badge">
            <Icon name="check_circle" size={14} /> Câu trả lời hay nhất
          </span>
        )}
        <div className="reply-node__bubble">
          <span className="reply-node__author">
            {reply.authorName}
            {reply.isAiAnswer && <span className="reply-node__ai-tag">AI</span>}
          </span>
          <div className="reply-node__body">
            <CollapsibleBody text={reply.body}>
              <MentionText>{reply.body}</MentionText>
            </CollapsibleBody>
          </div>
          {/* Inside the bubble on purpose: the citations are the evidence for
              the answer, and evidence behind a click is evidence nobody
              checks. */}
          <ReplyCitations citations={reply.citations ?? []} />
        </div>
        <div className="reply-node__meta">
          <time dateTime={reply.createdAt}>{formatRelativeTime(reply.createdAt)}</time>
          <ReactionBar
            targetType="DISCUSSION_REPLY"
            targetId={reply.id}
            summary={reply.reactions}
            variant="link"
          />
          <button type="button" className="reply-node__link" onClick={onReply}>
            Trả lời
          </button>
          {onAccept && (
            <button
              type="button"
              className={`reply-node__link ${isAccepted ? '' : 'reply-node__link--accept'}`}
              onClick={onAccept}
              title={
                isAccepted
                  ? 'Gỡ lời giải này, câu hỏi trở lại danh sách chưa giải đáp'
                  : 'Đánh dấu đây là lời giải'
              }
            >
              {isAccepted ? 'Bỏ chấp nhận' : 'Chấp nhận'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The assistant failing to answer, drawn as a status line rather than as a
 * comment.
 *
 * It names no author and has no actions: there is nothing to like or reply to
 * in "could not answer". It shows the server's own words, which say why (the
 * AI provider overloaded, the asker's quota used up, …) and how to try again;
 * a fixed sentence here used to hide every reason behind the same line.
 *
 * @param message the notice the assistant posted, rendered as plain text
 */
export function AssistantFallbackNote({ message }: { readonly message: string }) {
  return (
    <p className="reply-node__fallback" role="status">
      <Icon name="smart_toy" size={15} />
      {message}
    </p>
  );
}
