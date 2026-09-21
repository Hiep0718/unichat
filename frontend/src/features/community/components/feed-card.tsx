/**
 * A question in the feed.
 *
 * Layout puts the resolution state on a left rail and the title first, so a
 * reader scanning the list learns "does this still need help?" before anything
 * else. The previous card led with metadata and buried the state entirely.
 */
import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';
import type { FeedPostResponse } from '../feed-api';
import { AnswerStatusBadge } from './answer-status';
import { PostAttachments } from './post-attachments';
import { EntityAvatar } from '../../../components/entity-avatar';
import './feed-card.css';

interface FeedCardProps {
  readonly post: FeedPostResponse;
  readonly onOpen: () => void;
  readonly onNavigate: (path: string) => void;
  readonly onTagClick: (tag: string) => void;
  readonly onBookmark: (id: string) => void;
}

const LABEL_TEXT: Record<string, string> = {
  QUESTION: 'Câu hỏi',
  DISCUSSION: 'Thảo luận',
  ANNOUNCEMENT: 'Thông báo',
};

/** Strips Markdown syntax so the preview line reads as plain prose. */
function toPlainPreview(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function FeedCard({ post, onOpen, onNavigate, onTagClick, onBookmark }: FeedCardProps) {
  const preview = toPlainPreview(post.body);
  // Resolution state only means something for questions; an announcement is
  // never "unanswered".
  const isQuestion = post.label === 'QUESTION';

  return (
    <article className="feed-card">
      <div className="feed-card__rail">
        {isQuestion ? (
          <AnswerStatusBadge
            replyCount={post.replyCount}
            hasAcceptedAnswer={post.hasAcceptedAnswer}
            compact
          />
        ) : (
          <span className="feed-card__replies" title={`${post.replyCount} bình luận`}>
            <Icon name="chat_bubble_outline" size={18} />
            {post.replyCount}
          </span>
        )}
      </div>

      <div className="feed-card__main">
        <button type="button" className="feed-card__title-btn" onClick={onOpen}>
          {post.label && post.label !== 'DISCUSSION' && (
            <span className={`feed-card__label feed-card__label--${post.label.toLowerCase()}`}>
              {LABEL_TEXT[post.label] ?? post.label}
            </span>
          )}
          <h3 className="feed-card__title">{post.title}</h3>
        </button>

        {preview && <p className="feed-card__preview">{preview}</p>}

        {post.attachments?.length > 0 && (
          <PostAttachments
            workspaceId={post.workspaceId}
            discussionId={post.id}
            attachments={post.attachments}
            preview
          />
        )}

        <div className="feed-card__context">
          <button
            type="button"
            className="feed-card__ws"
            onClick={() => onNavigate(`/workspaces/${post.workspaceId}/discussions`)}
          >
            <EntityAvatar name={post.workspaceName} size={18} />
            {post.workspaceName}
          </button>
          <span className="feed-card__sep">·</span>
          <span>{post.authorName}</span>
          <span className="feed-card__sep">·</span>
          <time dateTime={post.createdAt}>{formatRelativeTime(post.createdAt)}</time>
        </div>

        {post.tags.length > 0 && (
          <div className="feed-card__tags">
            {post.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="feed-card__tag"
                onClick={() => onTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className={`feed-card__save ${post.isBookmarked ? 'feed-card__save--on' : ''}`}
        onClick={() => onBookmark(post.id)}
        aria-pressed={post.isBookmarked}
        title={post.isBookmarked ? 'Bỏ lưu' : 'Lưu bài viết'}
      >
        <Icon name={post.isBookmarked ? 'bookmark' : 'bookmark_border'} size={18} />
      </button>
    </article>
  );
}
