/**
 * Recursive threaded reply component (Reddit-style nested comments).
 * Renders a reply with its nested children via recursive tree.
 */
import { useState, useMemo } from 'react';

import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';
import { VoteControl } from './vote-control';
import { ReplyForm } from './reply-form';
import type { ReplyResponse } from '../community-api';
import '../discussion-page.css';

interface ReplyThreadProps {
  readonly reply: ReplyResponse;
  readonly repliesByParent: Map<string | null, ReplyResponse[]>;
  readonly onAddReply: (body: string, parentId?: string) => Promise<void>;
  readonly replyLoading: boolean;
}

/**
 * Renders a single reply node with its nested children recursively.
 */
export function ReplyThread({ reply, repliesByParent, onAddReply, replyLoading }: ReplyThreadProps) {
  const children = useMemo(
    () => repliesByParent.get(reply.id) ?? [],
    [repliesByParent, reply.id],
  );
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="reply-thread">
      <div className={`reply-node ${reply.isAiAnswer ? 'reply-node--ai' : ''}`}>
        <div className="reply-node__avatar">
          {reply.isAiAnswer
            ? <Icon name="smart_toy" size={16} />
            : reply.authorName?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="reply-node__content">
          <div className="reply-node__meta">
            <span className="reply-node__author">
              {reply.isAiAnswer ? 'UniChat AI' : reply.authorName}
            </span>
            <span className="reply-node__dot">•</span>
            <span className="reply-node__time">{formatRelativeTime(reply.createdAt)}</span>
          </div>
          <p className="reply-node__body">{reply.body}</p>
          <div className="reply-node__actions">
            <VoteControl
              targetType="DISCUSSION_REPLY"
              targetId={reply.id}
              initialScore={reply.voteScore}
              initialVote={reply.userVote}
              orientation="horizontal"
            />
            <button
              className="reply-node__action-btn"
              onClick={() => setShowForm(!showForm)}
            >
              <Icon name="reply" size={16} /> Trả lời
            </button>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
