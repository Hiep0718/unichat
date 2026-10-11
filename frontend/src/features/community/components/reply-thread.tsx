/**
 * Recursive threaded reply component (Reddit-style nested comments).
 * Renders a reply with its nested children via recursive tree.
 */
import { useState, useMemo } from 'react';

import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';
import { CollapsibleBody } from './collapsible-body';
import { MentionText } from './mention-text';
import { ReactionBar } from './reaction-bar';
import { ReplyCitations } from './reply-citations';
import { ReplyForm } from './reply-form';
import type { ReplyResponse } from '../community-api';
import '../discussion-page.css';

interface ReplyThreadProps {
  readonly reply: ReplyResponse;
  readonly repliesByParent: Map<string | null, ReplyResponse[]>;
  readonly onAddReply: (body: string, parentId?: string) => Promise<void>;
  readonly replyLoading: boolean;
  readonly onAcceptReply?: ((replyId: string) => void) | undefined;
  readonly acceptedReplyId?: string | null | undefined;
  readonly isPostAuthor?: boolean | undefined;
  /** Enables member suggestions in the nested reply form. */
  readonly workspaceId?: string | null | undefined;
}

/**
 * Renders a single reply node with its nested children recursively.
 */
export function ReplyThread({
  reply,
  repliesByParent,
  onAddReply,
  replyLoading,
  onAcceptReply,
  acceptedReplyId,
  isPostAuthor,
  workspaceId,
}: ReplyThreadProps) {
  const children = useMemo(
    () => repliesByParent.get(reply.id) ?? [],
    [repliesByParent, reply.id],
  );
  const [showForm, setShowForm] = useState(false);

  const isAccepted = acceptedReplyId === reply.id;

  return (
    <div className="reply-thread">
      <div className={`reply-node ${reply.isAiAnswer ? 'reply-node--ai' : ''} ${isAccepted ? 'reply-node--accepted' : ''}`}>
        <div className="reply-node__avatar">
          {reply.isAiAnswer
            ? <Icon name="smart_toy" size={16} />
            : reply.authorName?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="reply-node__content">
          <div className="reply-node__meta">
            <span className="reply-node__author">{reply.authorName}</span>
            <span className="reply-node__dot">•</span>
            <span className="reply-node__time">{formatRelativeTime(reply.createdAt)}</span>
            {isAccepted && (
              <span className="reply-node__accepted-badge">
                <Icon name="check_circle" size={14} /> Câu trả lời hay nhất
              </span>
            )}
          </div>
          <div className="reply-node__body">
            <CollapsibleBody text={reply.body}>
              <MentionText>{reply.body}</MentionText>
            </CollapsibleBody>
          </div>
          {/* Outside the fold on purpose: the citations are the evidence for
              the answer, and evidence behind a click is evidence nobody
              checks. */}
          <ReplyCitations citations={reply.citations ?? []} />
          <div className="reply-node__actions">
            <ReactionBar
              targetType="DISCUSSION_REPLY"
              targetId={reply.id}
              summary={reply.reactions}
              compact
            />
            <button
              className="reply-node__action-btn"
              onClick={() => setShowForm(!showForm)}
            >
              <Icon name="reply" size={16} /> Trả lời
            </button>
            {isPostAuthor && (
              <button
                className={`reply-node__action-btn ${
                  isAccepted ? '' : 'reply-node__action-btn--accept'
                }`}
                onClick={() => onAcceptReply?.(reply.id)}
                title={
                  isAccepted
                    ? 'Gỡ lời giải này, câu hỏi trở lại danh sách chưa giải đáp'
                    : 'Đánh dấu đây là lời giải'
                }
              >
                <Icon name={isAccepted ? 'undo' : 'check'} size={16} />
                {isAccepted ? ' Bỏ chấp nhận' : ' Chấp nhận'}
              </button>
            )}
          </div>
          {showForm && (
            <div className="reply-node__nested-form">
              <ReplyForm
                loading={replyLoading}
                onSubmit={async (b) => {
                  await onAddReply(b, reply.id);
                  setShowForm(false);
                }}
                onCancel={() => setShowForm(false)}
                workspaceId={workspaceId}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
      {children.length > 0 && (
        <div className="reply-thread__children">
          {children.map((child) => (
            <ReplyThread
              key={child.id}
              reply={child}
              repliesByParent={repliesByParent}
              onAddReply={onAddReply}
              replyLoading={replyLoading}
              onAcceptReply={onAcceptReply}
              acceptedReplyId={acceptedReplyId}
              isPostAuthor={isPostAuthor}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
