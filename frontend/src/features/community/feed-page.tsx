/**
 * Feed Page — Reddit/StackOverflow-style community feed.
 * Features: search, tag chips, sort (Hot/New/Top), bookmarks,
 * accepted answer badge, and real trending sidebar.
 * Route: /feed
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { formatRelativeTime } from '../../lib/format-time';
import {
  FeedPostResponse,
  FeedSort,
  FeedScope,
  TopRange,
  TrendingTag,
  FeedStats,
  fetchFeed,
  fetchTrendingTags,
  fetchFeedStats,
  toggleBookmark,
} from './feed-api';
import { VoteControl } from './components/vote-control';
import { CreatePostModal } from './components/create-post-modal';
import './feed-page.css';

export function FeedPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPostResponse[]>([]);
  const [scope, setScope] = useState<FeedScope>('JOINED');
  const [sort, setSort] = useState<FeedSort>('HOT');
  const [topRange, setTopRange] = useState<TopRange>('WEEK');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTopDropdown, setShowTopDropdown] = useState(false);

  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchFeed({
        sort,
        scope,
        q: searchQuery || undefined,
        tag: activeTag || undefined,
        range: sort === 'TOP' ? topRange : undefined,
        page,
      });
      setPosts(data.content);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải bảng tin';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sort, scope, searchQuery, activeTag, topRange, page]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  useEffect(() => {
    fetchTrendingTags(10).then(setTrendingTags).catch(() => {});
    fetchFeedStats().then(setStats).catch(() => {});
  }, []);

  /* --- Handlers --- */
  const handleScopeChange = (s: FeedScope) => {
    if (scope !== s) { setScope(s); setPage(0); setActiveTag(null); }
  };
  const handleSortChange = (s: FeedSort) => {
    if (sort !== s) { setSort(s); setPage(0); }
  };
  const handleTagClick = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag);
    setPage(0);
  };

  const handleBookmark = async (postId: string) => {
    try {
      const res = await toggleBookmark(postId);
      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, isBookmarked: res.bookmarked } : p
        )
      );
    } catch { /* silent */ }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { setPage(0); loadFeed(); }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const navigateToPost = (workspaceId: string, postId: string) => {
    navigate(`/feed/posts/${postId}?workspaceId=${workspaceId}`);
  };

  return (
    <div className="feed-page">
      <div className="feed-page__layout">
        {/* Left nav */}
        <FeedNav
          scope={scope}
          onScopeChange={handleScopeChange}
        />

        {/* Main */}
        <main className="feed-page__main">
          {/* Search bar */}
          <div className="feed-page__search-bar">
            <Icon name="search" size={20} />
            <input
              type="text"
              className="feed-page__search-input"
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="feed-page__search-clear"
                onClick={() => setSearchQuery('')}
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>

          {/* Sort tabs + Create */}
          <div className="feed-page__toolbar">
            <div className="feed-page__sort-tabs">
              <SortButton
                active={sort === 'HOT'}
                icon="local_fire_department"
                label="Hot"
                onClick={() => handleSortChange('HOT')}
              />
              <SortButton
                active={sort === 'NEW'}
                icon="schedule"
                label="Mới nhất"
                onClick={() => handleSortChange('NEW')}
              />
              <div className="feed-page__sort-top-wrapper">
                <SortButton
                  active={sort === 'TOP'}
                  icon="trending_up"
                  label="Top ▾"
                  onClick={() => {
                    if (sort === 'TOP') {
                      setShowTopDropdown(v => !v);
                    } else {
                      handleSortChange('TOP');
                      setShowTopDropdown(true);
                    }
                  }}
                />
                {showTopDropdown && sort === 'TOP' && (
                  <TopRangeDropdown
                    value={topRange}
                    onChange={r => { setTopRange(r); setShowTopDropdown(false); setPage(0); }}
                    onClose={() => setShowTopDropdown(false)}
                  />
                )}
              </div>
            </div>
            <button
              className="feed-page__create-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <Icon name="edit_square" size={18} />
              Tạo bài viết
            </button>
          </div>

          {/* Active tag filter chip */}
          {activeTag && (
            <div className="feed-page__active-filter">
              <span className="feed-page__filter-chip">
                <Icon name="tag" size={14} />
                {activeTag}
                <button onClick={() => setActiveTag(null)}>
                  <Icon name="close" size={12} />
                </button>
              </span>
            </div>
          )}

          {/* Posts */}
          <FeedPostList
            posts={posts}
            isLoading={isLoading}
            error={error}
            onPostClick={navigateToPost}
            onNavigate={navigate}
            onTagClick={handleTagClick}
            onBookmark={handleBookmark}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="feed-page__pagination">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <Icon name="chevron_left" size={18} /> Trước
              </button>
              <span>Trang {page + 1} / {totalPages}</span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Sau <Icon name="chevron_right" size={18} />
              </button>
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <FeedSidebar
          trendingTags={trendingTags}
          stats={stats}
          activeTag={activeTag}
          onTagClick={handleTagClick}
          onNavigate={navigate}
        />
      </div>

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

/* ========== Sub-components ========== */

function SortButton({ active, icon, label, onClick }: {
  active: boolean; icon: string; label: string; onClick: () => void;
}) {
  return (
    <button
      className={`feed-page__sort-btn ${active ? 'feed-page__sort-btn--active' : ''}`}
      onClick={onClick}
    >
      <Icon name={icon} size={18} />{label}
    </button>
  );
}

function TopRangeDropdown({ value, onChange, onClose }: {
  value: TopRange; onChange: (r: TopRange) => void; onClose: () => void;
}) {
  const options: { label: string; value: TopRange }[] = [
    { label: 'Hôm nay', value: 'TODAY' },
    { label: 'Tuần này', value: 'WEEK' },
    { label: 'Tháng này', value: 'MONTH' },
    { label: 'Năm nay', value: 'YEAR' },
    { label: 'Mọi lúc', value: 'ALL' },
  ];

  return (
    <>
      <div className="feed-page__dropdown-backdrop" onClick={onClose} />
      <div className="feed-page__top-dropdown">
        {options.map(o => (
          <button
            key={o.value}
            className={`feed-page__top-option ${value === o.value ? 'feed-page__top-option--active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

function FeedNav({ scope, onScopeChange }: {
  scope: FeedScope; onScopeChange: (s: FeedScope) => void;
}) {
  const items: { icon: string; label: string; scope: FeedScope }[] = [
    { icon: 'home', label: 'Trang chủ', scope: 'JOINED' },
    { icon: 'local_fire_department', label: 'Phổ biến', scope: 'ALL' },
    { icon: 'bookmark', label: 'Đã lưu', scope: 'SAVED' },
  ];

  return (
    <nav className="feed-page__nav">
      <ul className="feed-nav-list">
        {items.map(it => (
          <li
            key={it.scope}
            className={scope === it.scope ? 'active' : ''}
            onClick={() => onScopeChange(it.scope)}
          >
            <Icon name={it.icon} size={22} />{it.label}
          </li>
        ))}
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
  onTagClick: (tag: string) => void;
  onBookmark: (postId: string) => void;
}

function FeedPostList(props: FeedPostListProps) {
  const { posts, isLoading, error, onPostClick, onNavigate, onTagClick, onBookmark } = props;

  if (isLoading && posts.length === 0) {
    return (
      <div className="feed-page__loading">
        {[0, 1, 2].map(i => <FeedCardSkeleton key={i} />)}
      </div>
    );
  }
  if (error) {
    return (
      <div className="feed-page__error">
        <Icon name="error" size={24} /> {error}
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <div className="feed-page__empty">
        <Icon name="dynamic_feed" size={48} />
        <h3>Chưa có bài viết nào</h3>
        <p>Hãy tham gia thêm Workspace để xem các thảo luận.</p>
        <button
          className="feed-page__empty-btn"
          onClick={() => onNavigate('/workspaces')}
        >
          Khám phá Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="feed-page__list">
      {posts.map(post => (
        <FeedCard
          key={post.id}
          post={post}
          onClick={() => onPostClick(post.workspaceId, post.id)}
          onNavigate={onNavigate}
          onTagClick={onTagClick}
          onBookmark={onBookmark}
        />
      ))}
    </div>
  );
}

function FeedCard({ post, onClick, onNavigate, onTagClick, onBookmark }: {
  post: FeedPostResponse;
  onClick: () => void;
  onNavigate: (p: string) => void;
  onTagClick: (tag: string) => void;
  onBookmark: (id: string) => void;
}) {
  const labelName = (l: string) => {
    switch (l) {
      case 'QUESTION': return 'Câu hỏi';
      case 'DISCUSSION': return 'Thảo luận';
      case 'ANNOUNCEMENT': return 'Thông báo';
      default: return l;
    }
  };

  return (
    <article className="feed-card" onClick={onClick}>
      <div className="feed-card__meta">
        <div className="feed-card__ws-group">
          <img
            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${post.workspaceId}`}
            alt=""
            className="feed-card__ws-avatar"
          />
          <span
            className="feed-card__ws-name"
            onClick={e => {
              e.stopPropagation();
              onNavigate(`/workspaces/${post.workspaceId}/discussions`);
            }}
          >
            w/{post.workspaceName}
          </span>
        </div>
        <span className="feed-card__dot">•</span>
        <span className="feed-card__author">{post.authorName}</span>
        <span className="feed-card__dot">•</span>
        <time className="feed-card__time">
          {formatRelativeTime(post.createdAt)}
        </time>
      </div>

      <h3 className="feed-card__title">
        {post.label && (
          <span
            className={`feed-card__label feed-card__label--${post.label.toLowerCase()}`}
          >
            {labelName(post.label)}
          </span>
        )}
        {post.hasAcceptedAnswer && (
          <span className="feed-card__accepted-badge">
            <Icon name="check_circle" size={14} /> Đã giải đáp
          </span>
        )}
        {post.title}
      </h3>
      <p className="feed-card__body">{post.body}</p>

      {/* Tag chips */}
      {post.tags.length > 0 && (
        <div className="feed-card__tags">
          {post.tags.map(tag => (
            <span
              key={tag}
              className="feed-card__tag"
              onClick={e => { e.stopPropagation(); onTagClick(tag); }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="feed-card__footer">
        <VoteControl
          targetType="DISCUSSION"
          targetId={post.id}
          initialScore={post.voteScore}
          initialVote={post.userVote}
          orientation="horizontal"
        />
        <span className="feed-card__action-btn">
          <Icon name="chat_bubble_outline" size={18} /> {post.replyCount}
        </span>
        <span className="feed-card__action-btn">
          <Icon name="share" size={18} /> Chia sẻ
        </span>
        <span
          className={`feed-card__action-btn ${post.isBookmarked ? 'feed-card__action-btn--bookmarked' : ''}`}
          onClick={e => { e.stopPropagation(); onBookmark(post.id); }}
        >
          <Icon name={post.isBookmarked ? 'bookmark' : 'bookmark_border'} size={18} />
        </span>
      </div>
    </article>
  );
}

function FeedCardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-meta">
        <div className="skeleton-avatar" />
        <div className="skeleton-text short" />
      </div>
      <div className="skeleton-text title" />
      <div className="skeleton-text" />
      <div className="skeleton-text" />
      <div className="skeleton-footer">
        <div className="skeleton-btn" />
        <div className="skeleton-btn" />
      </div>
    </div>
  );
}

function FeedSidebar({ trendingTags, stats, activeTag, onTagClick, onNavigate }: {
  trendingTags: TrendingTag[];
  stats: FeedStats | null;
  activeTag: string | null;
  onTagClick: (tag: string) => void;
  onNavigate: (p: string) => void;
}) {
  return (
    <aside className="feed-page__sidebar">
      {/* Stats card */}
      {stats && (
        <div className="feed-sidebar-card">
          <div className="feed-sidebar-card__header">
            <Icon name="bar_chart" size={18} />
            <h3>Thống kê cộng đồng</h3>
          </div>
          <div className="feed-sidebar__stats-grid">
            <div className="feed-sidebar__stat">
              <strong>{stats.totalPosts}</strong>
              <span>Bài viết</span>
            </div>
          </div>
        </div>
      )}

      {/* Trending tags */}
      <div className="feed-sidebar-card">
        <div className="feed-sidebar-card__header">
          <Icon name="trending_up" size={18} />
          <h3>Xu hướng tuần này</h3>
        </div>
        {trendingTags.length > 0 ? (
          <ul className="feed-sidebar__trending-list">
            {trendingTags.map(t => (
              <li
                key={t.tag}
                className={activeTag === t.tag ? 'active' : ''}
                onClick={() => onTagClick(t.tag)}
              >
                <Icon name="tag" size={16} />
                <span className="feed-sidebar__tag-name">{t.tag}</span>
                <span className="feed-sidebar__tag-count">{t.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="feed-sidebar__empty-text">
            Chưa có tag nào. Tạo bài viết đầu tiên với hashtag!
          </p>
        )}
      </div>

      {/* About */}
      <div className="feed-sidebar-card">
        <div className="feed-sidebar-card__header">
          <Icon name="info" size={18} />
          <h3>Giới thiệu Bảng tin</h3>
        </div>
        <p className="feed-sidebar-card__body">
          Bảng tin tổng hợp thảo luận từ các Knowledge Space trên UniChat.
          Theo dõi câu hỏi, thông báo nổi bật, và đóng góp tri thức.
        </p>
        <button
          className="feed-sidebar-card__btn"
          onClick={() => onNavigate('/workspaces')}
        >
          Khám phá Workspace
        </button>
      </div>
    </aside>
  );
}
