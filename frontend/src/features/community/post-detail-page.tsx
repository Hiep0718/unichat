/**
 * Post Detail Page — dedicated route for viewing a single discussion post.
 * Route: /feed/posts/:postId?workspaceId=xxx
 * Replaces the previous overlay modal for better performance and UX.
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { formatRelativeTime, formatFullDateTime } from '../../lib/format-time';
import { getDiscussion, fetchReplies, addReply } from './community-api';
import type { DiscussionResponse, ReplyResponse } from './community-api';
import { VoteControl } from './components/vote-control';
import { ReplyForm } from './components/reply-form';
import { ReplyThread } from './components/reply-thread';
import './post-detail-page.css';

/**
 * Renders the full post detail view with threaded comments.
 */
export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspaceId');
  const navigate = useNavigate();

  const [discussion, setDiscussion] = useState<DiscussionResponse | null>(null);
  const [replies, setReplies] = useState<ReplyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyLoading, setReplyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !workspaceId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      getDiscussion(workspaceId, postId),
      fetchReplies(workspaceId, postId),
    ])
      .then(([disc, reps]) => {
        setDiscussion(disc);
        setReplies(reps);
      })
      .catch(() => setError('Không thể tải bài viết. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [postId, workspaceId]);

  const handleAddReply = async (body: string, parentId?: string) => {
    if (!workspaceId || !discussion) return;
    setReplyLoading(true);
    try {
      const payload: { body: string; parentReplyId?: string } = { body };
      if (parentId) payload.parentReplyId = parentId;
      const result = await addReply(workspaceId, discussion.id, payload);
      setReplies((prev) => [...prev, result]);
    } finally {
      setReplyLoading(false);
    }
  };

  const repliesByParent = useMemo(() => {
    const map = new Map<string | null, ReplyResponse[]>();
    map.set(null, []);
    for (const r of replies) {
      const pId = r.parentReplyId || null;
      if (!map.has(pId)) map.set(pId, []);
      map.get(pId)!.push(r);
    }
    return map;
  }, [replies]);

  const rootReplies = repliesByParent.get(null) ?? [];

  const labelName = (l: string | null) => {
    if (!l) return '';
    switch (l) {
      case 'QUESTION': return 'Câu hỏi';
      case 'DISCUSSION': return 'Thảo luận';
      case 'ANNOUNCEMENT': return 'Thông báo';
      default: return l;
    }
  };

  if (loading) {
    return <PostDetailSkeleton />;
  }

  if (error || !discussion) {
    return (
      <div className="post-detail-error">
        <Icon name="error_outline" size={48} />
        <h2>{error ?? 'Bài viết không tồn tại'}</h2>
        <button className="post-detail-error__btn" onClick={() => navigate('/feed')}>
          Quay lại Bảng tin
        </button>
      </div>
    );
  }

  return (
    <div className="post-detail">
      <div className="post-detail__layout">
        {/* Main content */}
        <main className="post-detail__main">
          {/* Back navigation */}
          <button className="post-detail__back" onClick={() => navigate('/feed')}>
            <Icon name="arrow_back" size={20} />
            <span>Quay lại Bảng tin</span>
          </button>

          {/* Post card */}
          <article className="post-detail__article">
            <div className="post-detail__post-meta">
              <img
                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${workspaceId}`}
                alt="workspace"
                className="post-detail__ws-avatar"
              />
              <span
                className="post-detail__ws-name"
                onClick={() => navigate(`/workspaces/${workspaceId}/discussions`)}
              >
                w/{discussion.authorName}
              </span>
              <span className="post-detail__dot">•</span>
              <span className="post-detail__author">
                Đăng bởi {discussion.authorName}
              </span>
              <span className="post-detail__dot">•</span>
              <time
                className="post-detail__time"
                title={formatFullDateTime(discussion.createdAt)}
              >
                {formatRelativeTime(discussion.createdAt)}
              </time>
            </div>

            <h1 className="post-detail__title">
              {discussion.label && (
                <span className={`post-detail__label post-detail__label--${discussion.label.toLowerCase()}`}>
                  {labelName(discussion.label)}
                </span>
              )}
              {discussion.title}
            </h1>

            <div className="post-detail__body">{discussion.body}</div>

            <div className="post-detail__actions">
              <VoteControl
                targetType="DISCUSSION"
                targetId={discussion.id}
                initialScore={discussion.voteScore}
                initialVote={discussion.userVote}
                orientation="horizontal"
              />
              <span className="post-detail__action-btn">
                <Icon name="chat_bubble" size={18} />
                {discussion.replyCount} Bình luận
              </span>
              <span className="post-detail__action-btn">
                <Icon name="visibility" size={18} />
                {discussion.viewCount} Lượt xem
              </span>
            </div>
          </article>

          {/* Reply input */}
          <div className="post-detail__reply-box">
            <ReplyForm loading={replyLoading} onSubmit={(b) => handleAddReply(b)} />
          </div>

          {/* Comment thread */}
          <section className="post-detail__comments">
            <h2 className="post-detail__comments-title">
              {replies.length} Bình luận
            </h2>
            <div className="post-detail__comments-list">
              {rootReplies.length === 0 ? (
                <div className="post-detail__no-comments">
                  <Icon name="forum" size={32} />
                  <p>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                </div>
              ) : (
                rootReplies.map((reply) => (
                  <ReplyThread
                    key={reply.id}
                    reply={reply}
                    repliesByParent={repliesByParent}
                    onAddReply={handleAddReply}
                    replyLoading={replyLoading}
                  />
                ))
              )}
            </div>
          </section>
        </main>

        {/* Sidebar */}
        <aside className="post-detail__sidebar">
          <div className="post-detail__sidebar-card">
            <div className="post-detail__sidebar-header">
              <Icon name="info" size={18} />
              <h3>Thông tin Workspace</h3>
            </div>
            <p className="post-detail__sidebar-desc">
              Nơi tập hợp các thảo luận và câu hỏi xoay quanh tài liệu RAG
              trong Knowledge Space này.
            </p>
            <div className="post-detail__sidebar-stats">
              <div className="post-detail__stat">
                <strong>{discussion.viewCount}</strong>
                <span>Lượt xem</span>
              </div>
              <div className="post-detail__stat">
                <strong>{replies.length}</strong>
                <span>Bình luận</span>
              </div>
            </div>
            <button
              className="post-detail__sidebar-btn"
              onClick={() => navigate(`/workspaces/${workspaceId}/discussions`)}
            >
              Xem Workspace
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Skeleton loading state for post detail. */
function PostDetailSkeleton() {
  return (
    <div className="post-detail">
      <div className="post-detail__layout">
        <main className="post-detail__main">
          <div className="post-detail__skeleton-back" />
          <div className="post-detail__skeleton-article">
            <div className="skeleton-line skeleton-line--short" />
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-line--medium" />
          </div>
        </main>
        <aside className="post-detail__sidebar">
          <div className="post-detail__skeleton-sidebar" />
        </aside>
      </div>
    </div>
  );
}

export default PostDetailPage;
