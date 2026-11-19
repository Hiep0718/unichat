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
 *
 * Laid out for reading first. The comments come before the box to write one,
 * the accepted answer comes first among them, and only the first few threads
 * show until the reader asks for the rest — the full discussion is on the
 * post's own page.
 */
import { useEffect, useMemo, useState } from 'react';

import { Icon } from '../../../components/icon';
import { groupByParent, hiddenCount, orderRoots } from '../comment-thread';
import { MyAvatar } from './my-avatar';
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

/** Threads shown before "Xem thêm"; enough to see whether it is worth opening. */
const COLLAPSED_THREADS = 3;

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
  const [expanded, setExpanded] = useState(false);

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
  const repliesByParent = useMemo(() => groupByParent(replies), [replies]);

  const rootReplies = useMemo(
    () => orderRoots(repliesByParent.get(null) ?? [], acceptedReplyId),
    [repliesByParent, acceptedReplyId],
  );
  const visibleRoots = expanded ? rootReplies : rootReplies.slice(0, COLLAPSED_THREADS);
  const hidden = hiddenCount(rootReplies.slice(visibleRoots.length), repliesByParent);

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
      // A new comment lands at the end of the list; open it up so the writer
      // sees what they just posted instead of it vanishing behind "Xem thêm".
      setExpanded(true);
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
      {loading ? (
        <p className="inline-comments__state">Đang tải bình luận...</p>
      ) : rootReplies.length === 0 ? (
        <p className="inline-comments__state">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
      ) : (
        <div className="inline-comments__list">
          {visibleRoots.map((reply) => (
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

      {hidden > 0 && (
        <button type="button" className="inline-comments__more" onClick={() => setExpanded(true)}>
          Xem thêm {hidden} bình luận
        </button>
      )}

      {aiReply.pending && (
        <p className="inline-comments__waiting" role="status">
          <Icon name="smart_toy" size={15} /> Trợ lý đang trả lời...
        </p>
      )}

      {error && (
        <p className="inline-comments__error" role="alert">
          <Icon name="error_outline" size={15} /> {error}
        </p>
      )}

      <ReplyForm
        variant="inline"
        loading={posting}
        onSubmit={(body) => void handleAddReply(body)}
        workspaceId={workspaceId}
        avatar={<MyAvatar />}
      />
    </section>
  );
}
