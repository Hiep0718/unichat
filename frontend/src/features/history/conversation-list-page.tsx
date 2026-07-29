import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import {
  fetchWorkspaceConversations,
  deleteWorkspaceConversation,
  createWorkspaceConversation,
  ConversationItem,
} from './conversation-api';
import { Icon } from '../../components/icon';

export function ConversationListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    let mounted = true;
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

  const handleCreateNew = async () => {
    if (!workspaceId) return;
    try {
      const newConv = await createWorkspaceConversation(workspaceId);
      navigate(`/workspaces/${workspaceId}/conversations/${newConv.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi tạo phiên mới');
    }
  };

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!workspaceId || !confirm('Bạn có chắc muốn xóa lịch sử hội thoại này?')) return;

    try {
      await deleteWorkspaceConversation(workspaceId, conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể xóa hội thoại');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Đang tải lịch sử hội thoại...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
            Lịch sử Hỏi đáp
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            Quản lý các phiên thảo luận và truy xuất tri thức đã lưu trong Workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNew}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            background: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Icon name="add" size={18} />
          Tạo cuộc hội thoại mới
        </button>
      </header>

      {error ? (
        <div style={{ color: '#e11d48', padding: '1rem', background: '#fff1f2', borderRadius: '0.375rem' }}>{error}</div>
      ) : conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <Icon name="history" size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.125rem', color: '#334155', marginBottom: '0.5rem' }}>Chưa có phiên hội thoại nào</h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Bắt đầu bằng cách hỏi AI một câu hỏi từ tài liệu Workspace.</p>
          <Link
            to={`/workspaces/${workspaceId}/chat`}
            style={{
              padding: '0.625rem 1.25rem',
              background: '#0284c7',
              color: '#ffffff',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Đến trang Trò chuyện
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {conversations.map((c) => (
            <Link
              key={c.id}
              to={`/workspaces/${workspaceId}/conversations/${c.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Icon name="chat_bubble_outline" size={20} style={{ color: '#0284c7' }} />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                    {c.title || 'Hội thoại'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Cập nhật: {new Date(c.updatedAt || c.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => handleDelete(e, c.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                }}
                title="Xóa hội thoại"
              >
                <Icon name="delete" size={18} />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConversationListPage;
