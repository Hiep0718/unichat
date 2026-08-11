import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { askWorkspaceQuestion, QuestionResponse } from './chat-api';
import { CitationPanel } from './components/citation-panel';
import { RefusalCard } from './components/refusal-card';
import { useWorkspace } from '../workspaces/workspace-context';
import { Icon } from '../../components/icon';
import './chat-page.css';

interface ChatPageProps {
  workspaceId?: string;
}

interface MessageItem {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  response?: QuestionResponse;
}

const SUGGESTIONS: readonly { icon: string; text: string }[] = [
  { icon: 'school', text: 'Tóm tắt nội dung chính của tài liệu' },
  { icon: 'compare_arrows', text: 'So sánh các khái niệm trong tài liệu' },
  { icon: 'help', text: 'Giải thích khái niệm quan trọng' },
];

export const ChatPage: React.FC<ChatPageProps> = ({ workspaceId: propWorkspaceId }) => {
  const params = useParams<{ workspaceId?: string }>();
  const workspaceContext = useWorkspace();

  const targetWorkspaceId = propWorkspaceId || params.workspaceId || workspaceContext?.workspace?.id;

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  if (!targetWorkspaceId) {
    return <div style={{ padding: '2rem', color: 'var(--color-error)' }}>Lỗi: Không tìm thấy Workspace ID</div>;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setLoading(true);

    const userMsg: MessageItem = {
      id: Date.now().toString(),
      role: 'USER',
      content: userText,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await askWorkspaceQuestion(targetWorkspaceId, {
        question: userText,
        conversationId,
      });

      if (!conversationId && res.conversationId) {
        setConversationId(res.conversationId);
      }

      const assistantMsg: MessageItem = {
        id: res.messageId,
        role: 'ASSISTANT',
        content: res.answer || res.refusalReason || 'Không có câu trả lời',
        response: res,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg: MessageItem = {
        id: Date.now().toString(),
        role: 'ASSISTANT',
        content: err instanceof Error ? err.message : 'Đã xảy ra lỗi khi truy vấn',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="chat-page">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <ChatEmptyState onSuggestionClick={handleSuggestionClick} />
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message chat-message--${msg.role.toLowerCase()}`}
              >
                <div className="chat-bubble">
                  {msg.role === 'ASSISTANT' ? (
                    <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.response && msg.response.decision === 'ANSWER' && (
                  <CitationPanel citations={msg.response.citations} />
                )}
                {msg.response && (msg.response.decision === 'REFUSE' || msg.response.decision === 'CLARIFY') && (
                  <RefusalCard
                    decision={msg.response.decision}
                    refusalReason={msg.response.refusalReason}
                  />
                )}
              </div>
            ))}
            {loading && <TypingIndicator />}
          </>
        )}
      </div>

      <form onSubmit={handleSend} className="chat-input-zone">
        <input
          type="text"
          className="chat-input"
          placeholder="Nhập câu hỏi tri thức (tối đa 2.000 ký tự)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          maxLength={2000}
        />
        <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
          {loading ? 'Đang suy nghĩ...' : 'Gửi câu hỏi'}
        </button>
      </form>
    </div>
  );
};

export default ChatPage;

/** Empty state with animated icon and suggestion chips. */
function ChatEmptyState({ onSuggestionClick }: { readonly onSuggestionClick: (t: string) => void }) {
  return (
    <div className="chat-empty">
      <div className="chat-empty__icon-ring">
        <Icon name="psychology" size={32} />
      </div>
      <h2 className="chat-empty__title">Hỏi đáp Tri thức AI</h2>
      <p className="chat-empty__subtitle">
        Nhập câu hỏi để truy xuất và suy luận từ tài liệu trong Workspace
      </p>
      <div className="chat-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            type="button"
            className="chat-suggestion-chip"
            onClick={() => onSuggestionClick(s.text)}
          >
            <Icon name={s.icon} size={16} />
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Bouncing dots typing indicator shown while waiting for AI response. */
function TypingIndicator() {
  return (
    <div className="chat-typing">
      <div className="chat-typing__dots">
        <span className="chat-typing__dot" />
        <span className="chat-typing__dot" />
        <span className="chat-typing__dot" />
      </div>
      <span className="chat-typing__label">Đang trích xuất & suy luận...</span>
    </div>
  );
}
