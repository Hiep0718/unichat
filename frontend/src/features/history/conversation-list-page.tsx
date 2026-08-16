import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import {
  fetchWorkspaceConversations,
  deleteWorkspaceConversation,
  ConversationItem,
} from './conversation-api';
import './conversation-list-page.css';

export function ConversationListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    let mounted = true;
    setLoading(true);

    fetchWorkspaceConversations(workspaceId)
      .then((res) => {
        if (mounted) {
          setConversations(res.content || []);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách hội thoại');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  const handleStartNewChat = () => {
    if (!workspaceId) return;
    navigate(`/workspaces/${workspaceId}/chat`);
  };

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!workspaceId || !confirm('Bạn có chắc muốn xóa lịch sử cuộc hội thoại này?')) return;

    try {
      await deleteWorkspaceConversation(workspaceId, conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể xóa hội thoại');
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const title = (c.title || 'Hội thoại').toLowerCase();
    return title.includes(searchQuery.trim().toLowerCase());
  });

  return (
    <div className="conv-list-container">
      {/* Hero Header Section */}
      <header className="conv-list-header">
        <div className="conv-list-header__info">
          <div className="conv-list-header__icon-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>history</span>
          </div>
          <div className="conv-list-header__titles">
            <h1 className="conv-list-header__title">Lịch sử Hỏi đáp & Tri thức</h1>
            <p className="conv-list-header__desc">
              Quản lý các phiên thảo luận và truy xuất lại tri thức đã hỏi đáp trong Workspace.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="conv-list-header__new-btn"
          onClick={handleStartNewChat}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
          <span>Tạo cuộc hội thoại mới</span>
        </button>
      </header>

      {/* Search & Filter Toolbar */}
      <div className="conv-list-toolbar">
        <div className="conv-list-search">
          <span className="material-symbols-outlined conv-list-search__icon">search</span>
          <input
            type="text"
            className="conv-list-search__input"
            placeholder="Tìm kiếm nội dung cuộc hội thoại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="conv-list-stats-pill">
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0284c7' }}>forum</span>
          <span>{filteredConversations.length} phiên hội thoại</span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="conv-list-skeleton-grid">
          <div className="conv-list-skeleton-card">
            <div className="chat-skeleton-line" style={{ width: '40px', height: '40px', borderRadius: '12px' }}></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="chat-skeleton-line" style={{ width: '40%' }}></div>
              <div className="chat-skeleton-line" style={{ width: '25%' }}></div>
            </div>
          </div>
          <div className="conv-list-skeleton-card">
            <div className="chat-skeleton-line" style={{ width: '40px', height: '40px', borderRadius: '12px' }}></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="chat-skeleton-line" style={{ width: '55%' }}></div>
              <div className="chat-skeleton-line" style={{ width: '30%' }}></div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div style={{ color: '#e11d48', padding: '1rem', background: '#fff1f2', borderRadius: '0.5rem', border: '1px solid #fecdd3' }}>
          {error}
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="conv-list-empty">
          <div className="conv-list-empty__icon-box">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>forum</span>
          </div>
          <h3 className="conv-list-empty__title">
            {searchQuery ? 'Không tìm thấy cuộc hội thoại phù hợp' : 'Chưa có phiên hội thoại nào'}
          </h3>
          <p className="conv-list-empty__desc">
            {searchQuery
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc tạo một cuộc trò chuyện hoàn toàn mới.'
              : 'Bắt đầu bằng cách hỏi UniChat AI một câu hỏi từ kho tài liệu trong Workspace.'}
          </p>
          <button
            type="button"
            className="conv-list-header__new-btn"
            onClick={handleStartNewChat}
            style={{ marginTop: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat</span>
            <span>Bắt đầu cuộc trò chuyện ngay</span>
          </button>
        </div>
      ) : (
        <div className="conv-list-grid">
          {filteredConversations.map((c) => (
            <Link
              key={c.id}
              to={`/workspaces/${workspaceId}/chat?conversationId=${c.id}`}
              className="conv-card"
            >
              <div className="conv-card__main">
                <div className="conv-card__icon-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>chat_bubble</span>
                </div>
                <div className="conv-card__details">
                  <h3 className="conv-card__title">{c.title || 'Cuộc hội thoại chưa đặt tên'}</h3>
                  <div className="conv-card__meta">
                    <span className="conv-card__time">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                      <span>Cập nhật: {new Date(c.updatedAt || c.createdAt).toLocaleString('vi-VN')}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="conv-card__actions">
                <span className="conv-card__continue-btn">
                  <span>Tiếp tục chat</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                </span>
                <button
                  type="button"
                  className="conv-card__delete-btn"
                  onClick={(e) => handleDelete(e, c.id)}
                  title="Xóa cuộc hội thoại này"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConversationListPage;

