import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedPostResponse, fetchFeed } from './feed-api';
import { VoteControl } from './components/vote-control';
import { Icon } from '../../components/icon';
import './feed-page.css';

export function FeedPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPostResponse[]>([]);
  const [scope, setScope] = useState<'JOINED' | 'ALL'>('JOINED');
  const [sort] = useState<'HOT' | 'NEW'>('HOT');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải bảng tin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScopeChange = (newScope: 'JOINED' | 'ALL') => {
    if (scope !== newScope) {
      setScope(newScope);
      setPage(0);
    }
  };

  const navigateToDiscussion = (workspaceId: string, discussionId: string) => {
    navigate(`/workspaces/${workspaceId}/discussions?discussionId=${discussionId}`);
  };

  return (
    <div className="feed-page">
      <header className="feed-page__header">
        <div className="feed-page__header-top">
          <h1 className="feed-page__title">Bảng tin cộng đồng</h1>
          <div className="feed-page__search">
            <Icon name="search" size={20} />
            <input type="text" placeholder="Tìm kiếm trong Bảng tin..." />
          </div>
        </div>
        <div className="feed-page__tabs">
          <button
            className={`feed-page__tab ${scope === 'JOINED' ? 'feed-page__tab--active' : ''}`}
            onClick={() => handleScopeChange('JOINED')}
          >
            🏠 Trang chủ
          </button>
          <button
            className={`feed-page__tab ${scope === 'ALL' ? 'feed-page__tab--active' : ''}`}
            onClick={() => handleScopeChange('ALL')}
          >
            🔥 Phổ biến
          </button>
        </div>
      </header>

      <div className="feed-page__layout">
        <main className="feed-page__main">
          <div className="feed-page__create-bar" onClick={() => navigate('/workspaces')}>
            <div className="feed-page__create-avatar">
              <Icon name="person" size={20} />
            </div>
            <input className="feed-page__create-input" type="text" placeholder="Tạo bài viết..." readOnly />
            <button className="feed-page__create-icon-btn"><Icon name="image" size={20} /></button>
            <button className="feed-page__create-icon-btn"><Icon name="link" size={20} /></button>
          </div>

          {isLoading && posts.length === 0 ? (
          <div className="feed-page__loading">Đang tải bảng tin...</div>
        ) : error ? (
          <div className="feed-page__error">{error}</div>
        ) : posts.length === 0 ? (
          <div className="feed-page__empty">
            <p>Không có bài viết nào.</p>
            <span className="feed-page__empty-sub">Hãy tham gia thêm workspace để xem các thảo luận.</span>
          </div>
        ) : (
          <div className="feed-page__list">
            {posts.map((post) => (
              <article 
                key={post.id} 
                className="feed-card"
                onClick={() => navigateToDiscussion(post.workspaceId, post.id)}
              >
                <div className="feed-card__meta">
                  <span className="feed-card__workspace" onClick={(e) => { e.stopPropagation(); navigate(`/workspaces/${post.workspaceId}/discussions`); }}>
                    w/{post.workspaceName}
                  </span>
                  <span className="feed-card__dot">•</span>
                  <span className="feed-card__author">Tạo bởi {post.authorName}</span>
                  <span className="feed-card__dot">•</span>
                  <time className="feed-card__time">
                    {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                  </time>
                </div>
                
                <h3 className="feed-card__title">
                  <span className="feed-card__label">[{post.label}]</span> {post.title}
                </h3>
                
                <p className="feed-card__body">{post.body}</p>
                
                <div className="feed-card__footer">
                  <VoteControl 
                    targetType="DISCUSSION" 
                    targetId={post.id} 
                    initialScore={post.voteScore} 
                    initialVote={post.userVote} 
                    orientation="horizontal"
                  />
                  <span className="feed-card__action-btn">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat_bubble</span>
                    {post.replyCount}
                  </span>
                  <span className="feed-card__action-btn">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>share</span>
                    Chia sẻ
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}


        {totalPages > 1 && (
          <div className="feed-page__pagination">
            <button 
              disabled={page === 0} 
              onClick={() => setPage((p) => p - 1)}
            >
              Trang trước
            </button>
            <span>Trang {page + 1} / {totalPages}</span>
            <button 
              disabled={page >= totalPages - 1} 
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </button>
          </div>
        )}
        </main>

        <aside className="feed-page__sidebar">
          <div className="feed-sidebar-card">
            <div className="feed-sidebar-card__header">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>info</span>
              <h3>Giới thiệu Bảng tin</h3>
            </div>
            <p className="feed-sidebar-card__body">
              Bảng tin là nơi tổng hợp các thảo luận từ các Workspace tri thức (RAG) trên toàn hệ thống UniChat. 
              Bạn có thể theo dõi những câu hỏi và thông báo nổi bật nhất tại đây.
            </p>
            <div className="feed-sidebar-card__footer">
              <button className="feed-sidebar-card__btn" onClick={() => navigate('/workspaces')}>
                Khám phá Workspace
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
