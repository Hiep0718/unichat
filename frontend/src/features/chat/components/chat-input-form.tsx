import React, { useState, useEffect, useRef } from 'react';

interface ChatInputFormProps {
  onSend: (text: string, allowExternalKnowledge: boolean) => void;
  loading: boolean;
}

const QUICK_PROMPTS = [
  { label: 'Tóm tắt tất cả thông tin các tài liệu', icon: 'summarize' },
  { label: 'Trích xuất nội dung lý thuyết chính', icon: 'export_notes' },
  { label: 'Hướng dẫn làm bài tập và quy cách nộp bài', icon: 'task' },
];

export const ChatInputForm: React.FC<ChatInputFormProps> = ({ onSend, loading }) => {
  const [input, setInput] = useState('');
  const [allowExternalKnowledge, setAllowExternalKnowledge] = useState<boolean>(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input.trim(), allowExternalKnowledge);
    setInput('');
  };

  const handleQuickPromptClick = (promptText: string) => {
    if (loading) return;
    onSend(promptText, allowExternalKnowledge);
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
        <div className="chat-input-form__wrapper">
          <button
            type="button"
            className={`chat-input-form__context-indicator ${
              allowExternalKnowledge
                ? 'chat-input-form__context-indicator--hybrid'
                : 'chat-input-form__context-indicator--strict'
            }`}
            onClick={() => setAllowExternalKnowledge((prev) => !prev)}
            title={
              allowExternalKnowledge
                ? 'Đang ở chế độ: RAG + AI Mở rộng (Click để đổi sang Chỉ theo Tài liệu)'
                : 'Đang ở chế độ: Chỉ theo Tài liệu Strict (Click để đổi sang RAG + AI Mở rộng)'
            }
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {allowExternalKnowledge ? 'public' : 'shield'}
            </span>
            <span className="chat-input-form__context-label">
              {allowExternalKnowledge ? 'RAG + AI Mở rộng' : 'Chỉ theo Tài liệu'}
            </span>
            <span className="material-symbols-outlined chat-input-form__swap-icon" style={{ fontSize: '15px' }}>
              swap_horiz
            </span>
          </button>

          <input
            ref={inputRef}
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
              className={`chat-input-form__submit-btn ${input.trim() || loading ? 'chat-input-form__submit-btn--active' : ''}`}
              disabled={loading || (!input.trim() && !loading)}
            >
              {loading ? (
                <span className="chat-input-form__loading-ring" />
              ) : (
                <span className="material-symbols-outlined">send</span>
              )}
              <span>{loading ? 'Đang suy nghĩ...' : 'Gửi'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
