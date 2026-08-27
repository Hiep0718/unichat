/**
 * Feed Page — Reddit-style community feed aggregating posts from joined workspaces.
 * Route: /feed
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { formatRelativeTime } from '../../lib/format-time';
import { FeedPostResponse, fetchFeed } from './feed-api';
import { VoteControl } from './components/vote-control';
import { CreatePostModal } from './components/create-post-modal';
import './feed-page.css';

type Scope = 'JOINED' | 'ALL';
type Sort = 'HOT' | 'NEW';

export function FeedPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPostResponse[]>([]);
  const [scope, setScope] = useState<Scope>('JOINED');
  const [sort, setSort] = useState<Sort>('HOT');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadFeed();
  }, [scope, sort, page]);

  const loadFeed = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchFeed(sort, scope, page, 20);
      setPosts(data.content);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải bảng tin';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScopeChange = (newScope: Scope) => {
    if (scope !== newScope) { setScope(newScope); setPage(0); }
  };

  const handleSortChange = (newSort: Sort) => {
    if (sort !== newSort) { setSort(newSort); setPage(0); }
  };

  const navigateToPost = (workspaceId: string, postId: string) => {
    navigate(`/feed/posts/${postId}?workspaceId=${workspaceId}`);
  };

  return (
    <div className="feed-page">
      <div className="feed-page__layout">
        {/* Left navigation */}
        <FeedNav scope={scope} onScopeChange={handleScopeChange} />

        {/* Main content */}
        <main className="feed-page__main">
          {/* Sort tabs + Create button */}
          <div className="feed-page__toolbar">
            <div className="feed-page__sort-tabs">
              <button
                className={`feed-page__sort-btn ${sort === 'HOT' ? 'feed-page__sort-btn--active' : ''}`}
                onClick={() => handleSortChange('HOT')}
              >
                <Icon name="local_fire_department" size={18} /> Hot
              </button>
              <button
                className={`feed-page__sort-btn ${sort === 'NEW' ? 'feed-page__sort-btn--active' : ''}`}
                onClick={() => handleSortChange('NEW')}
              >
                <Icon name="schedule" size={18} /> Mới nhất
              </button>
            </div>
            <button className="feed-page__create-btn" onClick={() => setShowCreateModal(true)}>
              <Icon name="edit_square" size={18} />
              Tạo bài viết
            </button>
          </div>

          {/* Create bar */}
          <div className="feed-page__create-bar" onClick={() => setShowCreateModal(true)}>
            <div className="feed-page__create-avatar">
              <Icon name="person" size={20} />
            </div>
            <input className="feed-page__create-input" type="text" placeholder="Bạn đang nghĩ gì?..." readOnly />
          </div>

          {/* Posts list */}
          <FeedPostList
            posts={posts}
            isLoading={isLoading}
            error={error}
            onPostClick={navigateToPost}
            onNavigate={navigate}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="feed-page__pagination">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <Icon name="chevron_left" size={18} /> Trước
              </button>
              <span>Trang {page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                Sau <Icon name="chevron_right" size={18} />
              </button>
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <FeedSidebar onNavigate={navigate} />
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(wsId, discId) => {
            setShowCreateModal(false);
            navigateToPost(wsId, discId);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function FeedNav({ scope, onScopeChange }: { scope: Scope; onScopeChange: (s: Scope) => void }) {
  return (
    <nav className="feed-page__nav">
      <ul className="feed-nav-list">
        <li className={scope === 'JOINED' ? 'active' : ''} onClick={() => onScopeChange('JOINED')}>
          <Icon name="home" size={22} /> Trang chủ
        </li>
        <li className={scope === 'ALL' ? 'active' : ''} onClick={() => onScopeChange('ALL')}>
          <Icon name="local_fire_department" size={22} /> Phổ biến
        </li>
      </ul>
    </nav>
  );
}

interface FeedPostListProps {
  posts: FeedPostResponse[];
  isLoading: boolean;
  error: string | null;
  onPostClick: (wsId: string, postId: string) => void;
  onNavigate: (path: string) => void;
}

function FeedPostList({ posts, isLoading, error, onPostClick, onNavigate }: FeedPostListProps) {
  if (isLoading && posts.length === 0) {
    return (
      <div className="feed-page__loading">
        {[0, 1, 2].map((i) => <FeedCardSkeleton key={i} />)}
      </div>
    );
  }
  if (error) return <div className="feed-page__error"><Icon name="error" size={24} /> {error}</div>;
  if (posts.length === 0) {
    return (
      <div className="feed-page__empty">
        <Icon name="dynamic_feed" size={48} />
        <h3>Chưa có bài viết nào</h3>
        <p>Hãy tham gia thêm Workspace để xem các thảo luận.</p>
        <button className="feed-page__empty-btn" onClick={() => onNavigate('/workspaces')}>
          Khám phá Workspace
        </button>
      </div>
    );
  }
  return (
    <div className="feed-page__list">
      {posts.map((post) => (
        <FeedCard key={post.id} post={post} onClick={() => onPostClick(post.workspaceId, post.id)} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function FeedCard({ post, onClick, onNavigate }: { post: FeedPostResponse; onClick: () => void; onNavigate: (p: string) => void }) {
  const labelName = (l: string) => {
    switch (l) { case 'QUESTION': return 'Câu hỏi'; case 'DISCUSSION': return 'Thảo luận'; case 'ANNOUNCEMENT': return 'Thông báo'; default: return l; }
  };
  return (
    <article className="feed-card" onClick={onClick}>
      <div className="feed-card__meta">
        <div className="feed-card__ws-group">
          <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${post.workspaceId}`} alt="" className="feed-card__ws-avatar" />
          <span className="feed-card__ws-name" onClick={(e) => { e.stopPropagation(); onNavigate(`/workspaces/${post.workspaceId}/discussions`); }}>
            w/{post.workspaceName}
          </span>
        </div>
        <span className="feed-card__dot">•</span>
        <span className="feed-card__author">{post.authorName}</span>
        <span className="feed-card__dot">•</span>
        <time className="feed-card__time">{formatRelativeTime(post.createdAt)}</time>
      </div>
      <h3 className="feed-card__title">
        {post.label && <span className={`feed-card__label feed-card__label--${post.label.toLowerCase()}`}>{labelName(post.label)}</span>}
        {post.title}
      </h3>
      <p className="feed-card__body">{post.body}</p>
      <div className="feed-card__footer">
        <VoteControl targetType="DISCUSSION" targetId={post.id} initialScore={post.voteScore} initialVote={post.userVote} orientation="horizontal" />
        <span className="feed-card__action-btn">
          <Icon name="chat_bubble_outline" size={18} /> {post.replyCount}
        </span>
        <span className="feed-card__action-btn">
          <Icon name="share" size={18} /> Chia sẻ
        </span>
      </div>
    </article>
  );
}

function FeedCardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-meta"><div className="skeleton-avatar" /><div className="skeleton-text short" /></div>
      <div className="skeleton-text title" />
      <div className="skeleton-text" />
      <div className="skeleton-text" />
      <div className="skeleton-footer"><div className="skeleton-btn" /><div className="skeleton-btn" /></div>
    </div>
  );
}

function FeedSidebar({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <aside className="feed-page__sidebar">
      <div className="feed-sidebar-card">
        <div className="feed-sidebar-card__header">
          <Icon name="info" size={18} /><h3>Giới thiệu Bảng tin</h3>
        </div>
        <p className="feed-sidebar-card__body">
          Bảng tin tổng hợp thảo luận từ các Knowledge Space trên UniChat.
          Theo dõi câu hỏi, thông báo nổi bật, và đóng góp tri thức.
        </p>
        <button className="feed-sidebar-card__btn" onClick={() => onNavigate('/workspaces')}>
          Khám phá Workspace
        </button>
      </div>
      <div className="feed-sidebar-card">
        <div className="feed-sidebar-card__header">
          <Icon name="trending_up" size={18} /><h3>Xu hướng</h3>
        </div>
        <ul className="feed-sidebar__trending-list">
          <li><Icon name="tag" size={16} /> #RAG_TiengViet</li>
          <li><Icon name="tag" size={16} /> #Llama3_Tuning</li>
          <li><Icon name="tag" size={16} /> #Chunking_Strategy</li>
        </ul>
      </div>
    </aside>
  );
}
