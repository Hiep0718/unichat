import React, { useState } from 'react';

interface ChatInputFormProps {
  onSend: (text: string) => void;
  loading: boolean;
}

export const ChatInputForm: React.FC<ChatInputFormProps> = ({ onSend, loading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      {loading && (
        <div className="chat-input-form__thinking">
          <div className="chat-input-form__dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <span className="chat-input-form__thinking-text">
            UniChat AI đang truy xuất vector & suy luận từ tài liệu...
          </span>
        </div>
      )}

      <div className="chat-input-form__wrapper">
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
            className="chat-input-form__submit-btn"
            disabled={loading || !input.trim()}
          >
            <span className="material-symbols-outlined">send</span>
            <span>{loading ? 'Đang gửi...' : 'Gửi'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
