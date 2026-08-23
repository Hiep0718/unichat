import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedPostResponse, fetchFeed } from './feed-api';
import { VoteControl } from './components/vote-control';
import './feed-page.css';

export function FeedPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPostResponse[]>([]);
  const [sort, setSort] = useState<'HOT' | 'NEW'>('HOT');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
  }, [sort, page]);

  const loadFeed = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchFeed(sort, page, 20);
      setPosts(data.content);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải bảng tin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortChange = (newSort: 'HOT' | 'NEW') => {
    if (sort !== newSort) {
      setSort(newSort);
      setPage(0);
    }
  };

  const navigateToDiscussion = (workspaceId: string, discussionId: string) => {
    navigate(`/workspaces/${workspaceId}?tab=discussions&discussionId=${discussionId}`);
  };

  return (
    <div className="feed-page">
      <header className="feed-page__header">
        <h1 className="feed-page__title">Bảng tin cộng đồng</h1>
        <div className="feed-page__tabs">
          <button
            className={`feed-page__tab ${sort === 'HOT' ? 'feed-page__tab--active' : ''}`}
            onClick={() => handleSortChange('HOT')}
          >
            🔥 Phổ biến
          </button>
          <button
            className={`feed-page__tab ${sort === 'NEW' ? 'feed-page__tab--active' : ''}`}
            onClick={() => handleSortChange('NEW')}
          >
            🆕 Mới nhất
          </button>
        </div>
      </header>

      <main className="feed-page__content">
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
                <div className="feed-card__vote">
                  <VoteControl 
                    targetType="DISCUSSION" 
                    targetId={post.id} 
                    initialScore={post.voteScore} 
                    initialVote={post.userVote} 
                  />
                </div>
                
                <div className="feed-card__content">
                  <div className="feed-card__meta">
                    <span className="feed-card__workspace" onClick={(e) => { e.stopPropagation(); navigate(`/workspaces/${post.workspaceId}`); }}>
                      {post.workspaceName}
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
                    <span className="feed-card__replies">💬 {post.replyCount} Bình luận</span>
                  </div>
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
    </div>
  );
}
