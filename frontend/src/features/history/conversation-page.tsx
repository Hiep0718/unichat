import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  fetchConversationDetail,
  ConversationDetailResponse,
} from './conversation-api';
import { askWorkspaceQuestion } from '../chat/chat-api';
import { Icon } from '../../components/icon';
import '../chat/chat-page.css';

export function ConversationPage() {
  const { workspaceId, conversationId } = useParams<{ workspaceId: string; conversationId: string }>();
  const [detail, setDetail] = useState<ConversationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const reloadDetail = async () => {
    if (!workspaceId || !conversationId) return;
    try {
      const data = await fetchConversationDetail(workspaceId, conversationId);
      setDetail(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải chi tiết cuộc hội thoại');
    }
  };

  useEffect(() => {
    if (!workspaceId || !conversationId) return;
    let mounted = true;
    fetchConversationDetail(workspaceId, conversationId)
      .then((data) => {
        if (mounted) {
          setDetail(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Lỗi khi tải chi tiết cuộc hội thoại');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, conversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !workspaceId || !conversationId) return;

    const questionText = input.trim();
    setInput('');
    setSending(true);

    try {
      await askWorkspaceQuestion(workspaceId, {
        question: questionText,
        conversationId,
      });
      await reloadDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi gửi câu hỏi');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Đang tải lịch sử...</div>;
  }

  if (error || !detail) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#e11d48' }}>
        <p>{error || 'Không tìm thấy cuộc hội thoại'}</p>
        <Link to={`/workspaces/${workspaceId}/conversations`}>Quay lại danh sách lịch sử</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to={`/workspaces/${workspaceId}/conversations`} style={{ color: '#64748b', textDecoration: 'none' }}>
          <Icon name="arrow_back" size={20} />
        </Link>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            {detail.title || 'Hội thoại'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Khởi tạo: {new Date(detail.createdAt).toLocaleString('vi-VN')}
          </span>
        </div>
      </header>

      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {detail.messages && detail.messages.length > 0 ? (
          detail.messages.map((msg) => (
            <div key={msg.id} className={`chat-message chat-message--${msg.role.toLowerCase()}`}>
              <div className="chat-bubble">
                {msg.role === 'ASSISTANT' ? (
                  <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>Chưa có tin nhắn trong hội thoại này.</div>
        )}
      </div>

      <form onSubmit={handleSend} className="chat-input-zone" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
        <input
          type="text"
          className="chat-input"
          placeholder="Tiếp tục thảo luận trong hội thoại này..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className="chat-send-btn" disabled={sending || !input.trim()}>
          {sending ? 'Đang gửi...' : 'Gửi'}
        </button>
      </form>
    </div>
  );
}

export default ConversationPage;
