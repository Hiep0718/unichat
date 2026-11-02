/**
 * The comment thread opened in place on a feed card.
 *
 * Reading a two-line answer used to cost a page navigation and a trip back,
 * which loses the reader's place in the feed. This mounts only when someone
 * opens it, so a feed of twenty cards still issues no reply requests until one
 * is asked for.
 *
 * Deliberately reuses {@link ReplyThread} and {@link ReplyForm} rather than
 * restating them: nesting, citations, reactions and the assistant's answers
 * all behave here exactly as they do on the post's own page, because it is the
 * same code.
 */
import { useEffect, useMemo, useState } from 'react';

import { Icon } from '../../../components/icon';
import { ReplyForm } from './reply-form';
import { ReplyThread } from './reply-thread';
import { addReply, fetchReplies } from '../community-api';
import { acceptReply, clearAcceptedReply } from '../feed-api';
import { useAuth } from '../../auth/auth-context';
import { useAiReplyWatch } from '../use-ai-reply-watch';
import { mentionsAi } from '../await-ai-reply';

import type { ReplyResponse } from '../community-api';
import './inline-comments.css';

interface InlineCommentsProps {
  readonly workspaceId: string;
  readonly discussionId: string;
  /** Only the asker may settle their own question. */
  readonly postAuthorId: string;
  /** The reply already accepted, null while the question is open. */
  readonly acceptedReplyId: string | null;
  /** Reported after each successful post so the card's count stays honest. */
  readonly onReplyCountChange?: (count: number) => void;
  /** Reported after accepting or taking back, so the card's chip follows. */
  readonly onAcceptedReplyChange?: (replyId: string | null) => void;
}

export function InlineComments({
  workspaceId,
  discussionId,
  postAuthorId,
  acceptedReplyId,
  onReplyCountChange,
  onAcceptedReplyChange,
}: InlineCommentsProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<ReplyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiReply = useAiReplyWatch(workspaceId, discussionId, (answer) =>
    setReplies((prev) => (prev.some((r) => r.id === answer.id) ? prev : [...prev, answer])));

  useEffect(() => {
    let cancelled = false;
    fetchReplies(workspaceId, discussionId)
      .then((data) => {
        if (!cancelled) setReplies(data);
      })
      .catch(() => {
        if (!cancelled) setError('Không tải được bình luận');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, discussionId]);

  /** Groups replies by parent so the thread renders without re-scanning. */
  const repliesByParent = useMemo(() => {
    const map = new Map<string | null, ReplyResponse[]>();
    for (const reply of replies) {
      const key = reply.parentReplyId;
      map.set(key, [...(map.get(key) ?? []), reply]);
    }
    return map;
  }, [replies]);

  const rootReplies = repliesByParent.get(null) ?? [];

  const handleAddReply = async (body: string, parentId?: string) => {
    setPosting(true);
    setError(null);
    try {
      const created = await addReply(workspaceId, discussionId, {
        body,
        ...(parentId ? { parentReplyId: parentId } : {}),
      });
      setReplies((prev) => {
        const next = [...prev, created];
        onReplyCountChange?.(next.length);
        return next;
      });
      // The assistant answers out of band, so the wait starts only when the
      // comment actually asked it something.
      if (mentionsAi(body)) {
        aiReply.watch(created.id);
      }
    } catch {
      setError('Không gửi được bình luận');
    } finally {
      setPosting(false);
    }
  };

  /**
   * Settles the question, or takes that back when the accepted reply is
   * chosen again — so the control that sets it is also the one that clears it.
   */
  const handleAcceptReply = async (replyId: string) => {
    const clearing = acceptedReplyId === replyId;
    setError(null);
    try {
      if (clearing) {
        await clearAcceptedReply(workspaceId, discussionId);
      } else {
        await acceptReply(workspaceId, discussionId, replyId);
      }
      onAcceptedReplyChange?.(clearing ? null : replyId);
    } catch {
      setError(clearing ? 'Không gỡ được lời giải' : 'Không chấp nhận được lời giải');
    }
  };

  const isPostAuthor = user?.id === postAuthorId;

  return (
    <section className="inline-comments" aria-label="Bình luận">
      <ReplyForm
        loading={posting}
        onSubmit={(body) => void handleAddReply(body)}
        workspaceId={workspaceId}
      />

      {error && (
        <p className="inline-comments__error" role="alert">
          <Icon name="error_outline" size={15} /> {error}
        </p>
      )}

      {aiReply.pending && (
        <p className="inline-comments__waiting">
          <Icon name="smart_toy" size={15} /> Trợ lý đang trả lời...
        </p>
      )}

      {loading ? (
        <p className="inline-comments__state">Đang tải bình luận...</p>
      ) : rootReplies.length === 0 ? (
        <p className="inline-comments__state">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
      ) : (
        <div className="inline-comments__list">
          {rootReplies.map((reply) => (
            <ReplyThread
              key={reply.id}
              reply={reply}
              repliesByParent={repliesByParent}
              onAddReply={handleAddReply}
              replyLoading={posting}
              onAcceptReply={isPostAuthor ? (id) => void handleAcceptReply(id) : undefined}
              acceptedReplyId={acceptedReplyId}
              isPostAuthor={isPostAuthor}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
