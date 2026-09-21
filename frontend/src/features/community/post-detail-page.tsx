/**
 * Post Detail Page — dedicated route for viewing a single discussion post.
 * Route: /feed/posts/:postId?workspaceId=xxx
 * Replaces the previous overlay modal for better performance and UX.
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { formatRelativeTime, formatFullDateTime } from '../../lib/format-time';
import {
  addReply,
  deleteDiscussion,
  fetchReplies,
  getDiscussion,
  updateDiscussion,
} from './community-api';
import type { DiscussionResponse, ReplyResponse } from './community-api';
import { AnswerStatusBadge } from './components/answer-status';
import { MentionText } from './components/mention-text';
import { EntityAvatar } from '../../components/entity-avatar';
import { ReactionBar } from './components/reaction-bar';
import { PostAttachments } from './components/post-attachments';
import { PostEditForm } from './components/post-edit-form';
import { PostOwnerMenu } from './components/post-owner-menu';
import { ReplyForm } from './components/reply-form';
import { ReplyThread } from './components/reply-thread';
import { useAuth } from '../auth/auth-context';
import { toggleBookmark, acceptReply } from './feed-api';
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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const { user } = useAuth();

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

  const handleAcceptReply = async (replyId: string) => {
    if (!workspaceId || !discussion) return;
    try {
      await acceptReply(workspaceId, discussion.id, replyId);
      setDiscussion(prev => prev ? { ...prev, acceptedReplyId: replyId } : null);
    } catch {
      /* ignore */
    }
  };

  const handleUpdate = async (values: { title: string; body: string }) => {
    if (!workspaceId || !discussion) return;
    setSaving(true);
    setEditError(null);
    try {
      const updated = await updateDiscussion(workspaceId, discussion.id, {
        ...values,
        tags: discussion.tags ?? [],
      });
      setDiscussion(updated);
      setIsEditing(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Không lưu được thay đổi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workspaceId || !discussion) return;
    try {
      await deleteDiscussion(workspaceId, discussion.id);
      navigate('/feed');
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Không xoá được bài viết');
    }
  };

  const handleBookmark = async () => {
    if (!discussion) return;
    try {
      const res = await toggleBookmark(discussion.id);
      setDiscussion(prev => prev ? { ...prev, isBookmarked: res.bookmarked } : null);
    } catch {
      /* ignore */
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

  // The accepted answer is lifted out of the thread and pinned above it, so a
  // reader gets the resolution without scanning every comment.
  const acceptedReply = useMemo(
    () => replies.find((r) => r.id === discussion?.acceptedReplyId) ?? null,
    [replies, discussion?.acceptedReplyId],
  );

  const rootReplies = (repliesByParent.get(null) ?? []).filter(
    (r) => r.id !== acceptedReply?.id,
  );

  const isAuthor = Boolean(user?.id && discussion && user.id === discussion.authorId);

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
              <button
                type="button"
                className="post-detail__ws-name"
                onClick={() => navigate(`/workspaces/${workspaceId}/discussions`)}
              >
                <EntityAvatar name={discussion.workspaceName ?? 'Workspace'} size={20} />
                {discussion.workspaceName ?? 'Workspace'}
              </button>
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
              <AnswerStatusBadge
                replyCount={discussion.replyCount}
                hasAcceptedAnswer={Boolean(discussion.acceptedReplyId)}
              />
              {discussion.editedAt && (
                <span className="post-detail__edited">đã chỉnh sửa</span>
              )}
              <PostOwnerMenu
                canEdit={isAuthor}
                canDelete={isAuthor}
                onEdit={() => setIsEditing(true)}
                onDelete={handleDelete}
              />
            </div>

            {isEditing ? (
              <PostEditForm
                initialTitle={discussion.title}
                initialBody={discussion.body}
                saving={saving}
                error={editError}
                onCancel={() => {
                  setIsEditing(false);
                  setEditError(null);
                }}
                onSave={handleUpdate}
              />
            ) : (
              <h1 className="post-detail__title">
                {discussion.label && (
                  <span className={`post-detail__label post-detail__label--${discussion.label.toLowerCase()}`}>
                    {labelName(discussion.label)}
                  </span>
                )}
                {discussion.title}
              </h1>
            )}

            {/* Tag chips */}
            {discussion.tags?.length > 0 && (
              <div className="post-detail__tags">
                {discussion.tags.map(tag => (
                  <span key={tag} className="post-detail__tag">{tag}</span>
                ))}
              </div>
            )}

            {!isEditing && (
              <>
                <div className="post-detail__body">
                  <MentionText>{discussion.body}</MentionText>
                </div>

                {workspaceId && (
                  <PostAttachments
                    workspaceId={workspaceId}
                    discussionId={discussion.id}
                    attachments={discussion.attachments ?? []}
                  />
                )}
              </>
            )}

            <div className="post-detail__actions">
              <ReactionBar
                targetType="DISCUSSION"
                targetId={discussion.id}
                summary={discussion.reactions}
              />
              <span className="post-detail__stat">
                <Icon name="chat_bubble" size={17} />
                {discussion.replyCount} bình luận
              </span>
              <span className="post-detail__stat">
                <Icon name="visibility" size={17} />
                {discussion.viewCount} lượt xem
              </span>
              <button
                type="button"
                className={`post-detail__action-btn ${discussion.isBookmarked ? 'post-detail__action-btn--bookmarked' : ''}`}
                onClick={handleBookmark}
                aria-pressed={discussion.isBookmarked}
              >
                <Icon name={discussion.isBookmarked ? 'bookmark' : 'bookmark_border'} size={17} />
                {discussion.isBookmarked ? 'Đã lưu' : 'Lưu'}
              </button>
            </div>
          </article>

          {/* Reply input */}
          <div className="post-detail__reply-box">
            <ReplyForm
              loading={replyLoading}
              onSubmit={(b) => handleAddReply(b)}
              workspaceId={workspaceId}
            />
          </div>

          {acceptedReply && (
            <section className="accepted-answer" aria-label="Câu trả lời được chấp nhận">
              <h2 className="accepted-answer__header">
                <Icon name="check_circle" size={18} />
                Câu trả lời được chấp nhận
              </h2>
              <div className="accepted-answer__meta">
                <EntityAvatar
                  name={acceptedReply.isAiAnswer ? 'AI' : acceptedReply.authorName}
                  size={22}
                  shape="circle"
                />
                <strong>{acceptedReply.isAiAnswer ? 'UniChat AI' : acceptedReply.authorName}</strong>
                <span className="post-detail__dot">•</span>
                <time dateTime={acceptedReply.createdAt}>
                  {formatRelativeTime(acceptedReply.createdAt)}
                </time>
              </div>
              <div className="accepted-answer__body">
                <MentionText>{acceptedReply.body}</MentionText>
              </div>
              <ReactionBar
                targetType="DISCUSSION_REPLY"
                targetId={acceptedReply.id}
                summary={acceptedReply.reactions}
              />
            </section>
          )}

          {/* Comment thread */}
          <section className="post-detail__comments">
            <h2 className="post-detail__comments-title">
              {acceptedReply ? `${replies.length - 1} bình luận khác` : `${replies.length} bình luận`}
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
                    onAcceptReply={handleAcceptReply}
                    acceptedReplyId={discussion.acceptedReplyId}
                    isPostAuthor={user?.id === discussion.authorId}
                    workspaceId={workspaceId}
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
