/**
 * A comment and the replies under it.
 *
 * Indented one level only. Replies to replies are drawn at that same level
 * rather than stepping further right each time: a card in the feed has no
 * width to give away, and five levels of indentation turned a conversation
 * into a staircase.
 */
import { useMemo, useState } from 'react';

import { isAssistantFallback } from '../comment-thread';
import { AssistantFallbackNote, ReplyNode } from './reply-node';
import { ReplyForm } from './reply-form';

import type { RepliesByParent } from '../comment-thread';
import type { ReplyResponse } from '../community-api';

import '../discussion-page.css';

interface ReplyThreadProps {
  readonly reply: ReplyResponse;
  readonly repliesByParent: RepliesByParent;
  readonly onAddReply: (body: string, parentId?: string) => Promise<void>;
  readonly replyLoading: boolean;
  readonly onAcceptReply?: ((replyId: string) => void) | undefined;
  readonly acceptedReplyId?: string | null | undefined;
  readonly isPostAuthor?: boolean | undefined;
  /** Enables member suggestions in the nested reply form. */
  readonly workspaceId?: string | null | undefined;
  /** 0 for a top-level comment. Only depth 0 indents its children. */
  readonly depth?: number;
}

/**
 * Renders a reply with its nested children, recursively.
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
  depth = 0,
}: ReplyThreadProps) {
  const children = useMemo(
    () => repliesByParent.get(reply.id) ?? [],
    [repliesByParent, reply.id],
  );
  const [showForm, setShowForm] = useState(false);

  if (isAssistantFallback(reply)) {
    return <AssistantFallbackNote />;
  }

  const isAccepted = acceptedReplyId === reply.id;
  const childrenClass = depth === 0 ? 'reply-thread__children' : 'reply-thread__children reply-thread__children--flat';

  return (
    <div className="reply-thread">
      <ReplyNode
        reply={reply}
        isAccepted={isAccepted}
        onAccept={onAcceptReply ? () => onAcceptReply(reply.id) : undefined}
        onReply={() => setShowForm((open) => !open)}
        nested={depth > 0}
      />
      {showForm && (
        <div className="reply-node__nested-form">
          <ReplyForm
            variant="inline"
            loading={replyLoading}
            onSubmit={async (b) => {
              await onAddReply(b, reply.id);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
            placeholder={`Trả lời ${reply.authorName}…`}
            workspaceId={workspaceId}
            autoFocus
          />
        </div>
      )}
      {children.length > 0 && (
        <div className={childrenClass}>
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
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
