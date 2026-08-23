import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FeedPostResponse, fetchFeed } from './feed-api';
import { VoteControl } from './components/vote-control';
import { Icon } from '../../components/icon';
import { DiscussionDetail } from './discussion-page';
import { getDiscussion, DiscussionResponse } from './community-api';
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

  const [searchParams, setSearchParams] = useSearchParams();
  const postId = searchParams.get('postId');
  const wId = searchParams.get('workspaceId');
  const [activeDiscussion, setActiveDiscussion] = useState<DiscussionResponse | null>(null);

  useEffect(() => {
    if (postId && wId) {
      getDiscussion(wId, postId)
        .then(setActiveDiscussion)
        .catch(() => setSearchParams({}));
    } else {
      setActiveDiscussion(null);
    }
  }, [postId, wId, setSearchParams]);

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
    setSearchParams({ workspaceId, postId: discussionId });
  };

  return (
    <div className="feed-page-wrapper">
      <div className="feed-page">
        <header className="feed-page__header">
          <div className="feed-page__header-top">
            <h1 className="feed-page__title">Bảng tin cộng đồng</h1>
            <div className="feed-page__search">
              <Icon name="search" size={20} />
              <input type="text" placeholder="Tìm kiếm trong Bảng tin..." />
            </div>
          </div>
        </header>

      <div className="feed-page__layout">
        <nav className="feed-page__nav">
          <div className="feed-nav-card">
            <ul className="feed-nav-list">
              <li 
                className={scope === 'JOINED' ? 'active' : ''} 
                onClick={() => handleScopeChange('JOINED')}
              >
                <Icon name="home" size={24} /> Trang chủ
              </li>
              <li 
                className={scope === 'ALL' ? 'active' : ''} 
                onClick={() => handleScopeChange('ALL')}
              >
                <Icon name="local_fire_department" size={24} /> Phổ biến
              </li>
              <li onClick={() => navigate('/workspaces')}>
                <Icon name="explore" size={24} /> Khám phá
              </li>
            </ul>
          </div>
        </nav>

        <main className="feed-page__main">
          <div className="feed-page__create-bar" onClick={() => navigate('/workspaces')}>
            <div className="feed-page__create-avatar">
              <img src="https://api.dicebear.com/7.x/identicon/svg?seed=user_avatar" alt="Avatar" />
            </div>
            <input className="feed-page__create-input" type="text" placeholder="Tạo bài viết..." readOnly />
            <button className="feed-page__create-icon-btn"><Icon name="image" size={20} /></button>
            <button className="feed-page__create-icon-btn"><Icon name="link" size={20} /></button>
          </div>

          {isLoading && posts.length === 0 ? (
          <div className="feed-page__loading">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-meta">
                  <div className="skeleton-avatar"></div>
                  <div className="skeleton-text short"></div>
                </div>
                <div className="skeleton-text title"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-footer">
                  <div className="skeleton-btn"></div>
                  <div className="skeleton-btn"></div>
                </div>
              </div>
            ))}
          </div>
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
                  <div className="feed-card__workspace-group">
                    <img 
                      src={`https://api.dicebear.com/7.x/identicon/svg?seed=${post.workspaceId}`} 
                      alt="avatar" 
                      className="feed-card__workspace-avatar" 
                    />
                    <span className="feed-card__workspace" onClick={(e) => { e.stopPropagation(); navigate(`/workspaces/${post.workspaceId}/discussions`); }}>
                      w/{post.workspaceName}
                    </span>
                  </div>
                  <span className="feed-card__dot">•</span>
                  <time className="feed-card__time">
                    {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                  </time>
                  <span className="feed-card__dot">•</span>
                  <button className="feed-card__join-btn" onClick={(e) => { e.stopPropagation(); navigate(`/workspaces/${post.workspaceId}/discussions`); }}>
                    Tham gia
                  </button>
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
            <div className="feed-sidebar-card">
              <div className="feed-sidebar-card__header">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>trending_up</span>
                <h3>Xu hướng</h3>
              </div>
              <ul className="feed-sidebar__trending-list">
                <li><Icon name="tag" size={16} /> #RAG_TiengViet</li>
                <li><Icon name="tag" size={16} /> #Llama3_Tuning</li>
                <li><Icon name="tag" size={16} /> #Chunking_Strategy</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>

      {activeDiscussion && wId && (
        <DiscussionDetail 
          workspaceId={wId} 
          discussion={activeDiscussion} 
          onBack={() => setSearchParams({})} 
        />
      )}
    </div>
  );
}
