/**
 * A question in the feed.
 *
 * The header names the group and the author and carries the resolution state
 * on the right, so a reader scanning the list learns "where is this, and does
 * it still need help?" before the title. The state used to sit in a 44px rail
 * down the left, which cost a column of width to show one number.
 */
import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';
import type { FeedPostResponse } from '../feed-api';
import { resolveAnswerStatus } from './answer-status';
import { ReactionBar } from './reaction-bar';
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

const STATUS_TEXT: Record<string, string> = {
  RESOLVED: 'Đã có lời giải',
  DISCUSSING: 'Đang thảo luận',
  UNANSWERED: 'Chưa có lời giải',
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
  const status = resolveAnswerStatus(post.replyCount, post.hasAcceptedAnswer);

  return (
    <article className="feed-card">
      <header className="feed-card__head">
        <button
          type="button"
          className="feed-card__ws"
          onClick={() => onNavigate(`/workspaces/${post.workspaceId}/discussions`)}
        >
          <EntityAvatar name={post.workspaceName} size={34} />
          <span className="feed-card__ws-text">
            <span className="feed-card__ws-name">{post.workspaceName}</span>
          </span>
        </button>

        <span className="feed-card__byline">
          <button
            type="button"
            className="feed-card__author"
            onClick={() => onNavigate(`/users/${post.authorId}`)}
          >
            {post.authorName}
          </button>
          <span aria-hidden="true"> · </span>
          <time dateTime={post.createdAt}>{formatRelativeTime(post.createdAt)}</time>
        </span>

        {isQuestion && (
          <span className={`feed-card__status feed-card__status--${status.toLowerCase()}`}>
            {status === 'RESOLVED' && <Icon name="check" size={14} />}
            {STATUS_TEXT[status]}
          </span>
        )}
        {!isQuestion && post.label && post.label !== 'DISCUSSION' && (
          <span className="feed-card__status feed-card__status--announcement">
            {LABEL_TEXT[post.label] ?? post.label}
          </span>
        )}
      </header>

      <button type="button" className="feed-card__title-btn" onClick={onOpen}>
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

      <footer className="feed-card__foot">
        <ReactionBar
          targetType="DISCUSSION"
          targetId={post.id}
          summary={post.reactions}
          compact
        />
        <button type="button" className="feed-card__replies" onClick={onOpen}>
          <Icon name="chat_bubble_outline" size={16} />
          {post.replyCount} bình luận
        </button>
        <button
          type="button"
          className={`feed-card__save ${post.isBookmarked ? 'feed-card__save--on' : ''}`}
          onClick={() => onBookmark(post.id)}
          aria-pressed={post.isBookmarked}
          aria-label={post.isBookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
        >
          <Icon name={post.isBookmarked ? 'bookmark' : 'bookmark_border'} size={17} />
        </button>
      </footer>
    </article>
  );
}
