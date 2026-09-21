/**
 * Feed — questions from every Knowledge Space the member belongs to.
 *
 * Organised around whether a question still needs help rather than around
 * popularity: the views are "unanswered / newest / mine", not hot/top.
 * Route: /feed
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../../components/icon';
import {
  FeedPostResponse,
  FeedScope,
  FeedSort,
  FeedStats,
  TrendingTag,
  fetchFeed,
  fetchFeedStats,
  fetchTrendingTags,
  toggleBookmark,
} from './feed-api';
import { CreatePostModal } from './components/create-post-modal';
import { FeedCard } from './components/feed-card';
import { FeedSidebar } from './components/feed-sidebar';
import './feed-page.css';

/** Task-oriented views, in the order a member is most likely to need them. */
const VIEWS: readonly { id: FeedSort; label: string; icon: string }[] = [
  { id: 'UNANSWERED', label: 'Chưa giải đáp', icon: 'help' },
  { id: 'NEW', label: 'Mới nhất', icon: 'schedule' },
  { id: 'MINE', label: 'Của tôi', icon: 'person' },
];

const SCOPES: readonly { id: FeedScope; label: string; icon: string }[] = [
  { id: 'JOINED', label: 'Không gian của tôi', icon: 'home' },
  { id: 'ALL', label: 'Công khai', icon: 'public' },
  { id: 'SAVED', label: 'Đã lưu', icon: 'bookmark' },
];

export function FeedPage() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState<FeedPostResponse[]>([]);
  const [scope, setScope] = useState<FeedScope>('JOINED');
  const [view, setView] = useState<FeedSort>('UNANSWERED');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);

  // Debounce the search box into `query`; the fetch effect depends only on the
  // debounced value, so typing no longer fires a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchFeed({
      sort: view,
      scope,
      q: query || undefined,
      tag: activeTag || undefined,
      page,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setPosts(data.content);
        setTotalPages(data.totalPages);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Lỗi khi tải bảng tin');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [view, scope, query, activeTag, page]);

  const loadSidebar = useCallback(() => {
    fetchTrendingTags(8).then(setTrendingTags).catch(() => setTrendingTags([]));
    fetchFeedStats().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => loadSidebar(), [loadSidebar]);

  const handleBookmark = async (postId: string) => {
    try {
      const res = await toggleBookmark(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isBookmarked: res.bookmarked } : p))
      );
    } catch {
      setError('Không lưu được bài viết. Vui lòng thử lại.');
    }
  };

  const openPost = (workspaceId: string, postId: string) =>
    navigate(`/feed/posts/${postId}?workspaceId=${workspaceId}`);

  const changeScope = (next: FeedScope) => {
    if (next === scope) return;
    setScope(next);
    setPage(0);
    setActiveTag(null);
  };

  const changeView = (next: FeedSort) => {
    if (next === view) return;
    setView(next);
    setPage(0);
  };

  const handleTagClick = (tag: string) => {
    setActiveTag((current) => (current === tag ? null : tag));
    setPage(0);
  };

  return (
    <div className="feed-page">
      <div className="feed-page__layout">
        <nav className="feed-page__scopes" aria-label="Phạm vi bảng tin">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`feed-scope ${scope === s.id ? 'feed-scope--active' : ''}`}
              onClick={() => changeScope(s.id)}
            >
              <Icon name={s.icon} size={20} />
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <main className="feed-page__main">
          <header className="feed-page__header">
            <div className="feed-page__search">
              <Icon name="search" size={19} />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm câu hỏi, chủ đề..."
                aria-label="Tìm kiếm bài viết"
              />
            </div>
            <button
              type="button"
              className="feed-page__ask"
              onClick={() => setShowCreate(true)}
            >
              <Icon name="edit_square" size={18} />
              Đặt câu hỏi
            </button>
          </header>

          <div className="feed-page__views" role="tablist">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                className={`feed-view ${view === v.id ? 'feed-view--active' : ''}`}
                onClick={() => changeView(v.id)}
              >
                <Icon name={v.icon} size={17} />
                {v.label}
                {v.id === 'UNANSWERED' && (stats?.unansweredCount ?? 0) > 0 && (
                  <span className="feed-view__count">{stats?.unansweredCount}</span>
                )}
              </button>
            ))}
          </div>

          {activeTag && (
            <div className="feed-page__filter">
              <span className="feed-page__filter-chip">
                <Icon name="tag" size={14} />
                {activeTag}
                <button type="button" onClick={() => setActiveTag(null)} aria-label="Bỏ lọc thẻ">
                  <Icon name="close" size={13} />
                </button>
              </span>
            </div>
          )}

          <FeedList
            posts={posts}
            isLoading={isLoading}
            error={error}
            view={view}
            onOpen={openPost}
            onNavigate={navigate}
            onTagClick={handleTagClick}
            onBookmark={handleBookmark}
            onAsk={() => setShowCreate(true)}
          />

          {totalPages > 1 && (
            <nav className="feed-page__pager" aria-label="Phân trang">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <Icon name="chevron_left" size={18} /> Trước
              </button>
              <span>Trang {page + 1} / {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau <Icon name="chevron_right" size={18} />
              </button>
            </nav>
          )}
        </main>

        <FeedSidebar
          stats={stats}
          trendingTags={trendingTags}
          activeTag={activeTag}
          onTagClick={handleTagClick}
          onShowUnanswered={() => changeView('UNANSWERED')}
          onNavigate={navigate}
        />
      </div>

      {showCreate && (
        <CreatePostModal
          heading="Đặt câu hỏi"
          initialLabel="QUESTION"
          onClose={() => setShowCreate(false)}
          onCreated={(wsId, postId) => {
            setShowCreate(false);
            loadSidebar();
            openPost(wsId, postId);
          }}
          onOpenExisting={(wsId, postId) => {
            setShowCreate(false);
            openPost(wsId, postId);
          }}
        />
      )}
    </div>
  );
}

interface FeedListProps {
  readonly posts: readonly FeedPostResponse[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly view: FeedSort;
  readonly onOpen: (workspaceId: string, postId: string) => void;
  readonly onNavigate: (path: string) => void;
  readonly onTagClick: (tag: string) => void;
  readonly onBookmark: (id: string) => void;
  readonly onAsk: () => void;
}

const EMPTY_TEXT: Record<FeedSort, { title: string; hint: string }> = {
  UNANSWERED: {
    title: 'Mọi câu hỏi đều đã được giải đáp',
    hint: 'Không còn câu nào đang chờ. Quay lại sau nhé.',
  },
  NEW: {
    title: 'Chưa có câu hỏi nào',
    hint: 'Khi tài liệu chưa đủ căn cứ, hãy đặt câu hỏi cho cả nhóm.',
  },
  MINE: {
    title: 'Bạn chưa đặt câu hỏi nào',
    hint: 'Câu hỏi bạn đăng sẽ xuất hiện ở đây.',
  },
};

function FeedList({
  posts,
  isLoading,
  error,
  view,
  onOpen,
  onNavigate,
  onTagClick,
  onBookmark,
  onAsk,
}: FeedListProps) {
  if (isLoading && posts.length === 0) {
    return (
      <div className="feed-page__list">
        {[0, 1, 2].map((i) => (
          <div key={i} className="feed-skeleton" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-page__state feed-page__state--error">
        <Icon name="error_outline" size={36} />
        <p>{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    const text = EMPTY_TEXT[view];
    return (
      <div className="feed-page__state">
        <Icon name="forum" size={40} />
        <h3>{text.title}</h3>
        <p>{text.hint}</p>
        <button type="button" className="feed-page__ask" onClick={onAsk}>
          <Icon name="edit_square" size={18} />
          Đặt câu hỏi
        </button>
      </div>
    );
  }

  return (
    <div className="feed-page__list">
      {posts.map((post) => (
        <FeedCard
          key={post.id}
          post={post}
          onOpen={() => onOpen(post.workspaceId, post.id)}
          onNavigate={onNavigate}
          onTagClick={onTagClick}
          onBookmark={onBookmark}
        />
      ))}
    </div>
  );
}
