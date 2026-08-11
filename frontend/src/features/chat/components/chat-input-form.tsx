import React, { useState } from 'react';

interface ChatInputFormProps {
  onSend: (text: string) => void;
  loading: boolean;
}

const QUICK_PROMPTS = [
  { label: 'Tóm tắt tất cả thông tin các tài liệu', icon: 'summarize' },
  { label: 'Trích xuất nội dung lý thuyết chính', icon: 'export_notes' },
  { label: 'Hướng dẫn làm bài tập và quy cách nộp bài', icon: 'task' },
];

export const ChatInputForm: React.FC<ChatInputFormProps> = ({ onSend, loading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleQuickPromptClick = (promptText: string) => {
    if (loading) return;
    onSend(promptText);
  };

  return (
    <div className="chat-input-container">
      {/* Quick Suggested Prompts Toolbar */}
      <div className="chat-quick-prompts">
        {QUICK_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            className="chat-quick-prompt-btn"
            onClick={() => handleQuickPromptClick(item.label)}
            disabled={loading}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        {loading && (
          <div className="chat-input-form__thinking">
            <div className="chat-input-form__dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
            <span className="chat-input-form__thinking-text">
              UniChat AI đang truy xuất vector & suy luận từ kho tài liệu...
            </span>
          </div>
        )}

        <div className="chat-input-form__wrapper">
          <div className="chat-input-form__context-indicator" title="Đã kết nối cơ sở tri thức RAG Workspace">
            <span className="material-symbols-outlined">database</span>
            <span>RAG Active</span>
          </div>

          <input
            type="text"
            className="chat-input-form__field"
            placeholder="Nhập câu hỏi tri thức (tối đa 2.000 ký tự)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            maxLength={2000}
          />

          <div className="chat-input-form__controls">
            <span className="chat-input-form__counter">
              {input.length}/2000
            </span>
            <button
              type="submit"
              className={`chat-input-form__submit-btn ${input.trim() ? 'chat-input-form__submit-btn--active' : ''}`}
              disabled={loading || !input.trim()}
            >
              <span className="material-symbols-outlined">send</span>
              <span>{loading ? 'Đang gửi...' : 'Gửi'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
