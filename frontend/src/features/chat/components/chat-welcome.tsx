import React from 'react';

interface ChatWelcomeProps {
  onSelectPrompt: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    icon: 'menu_book',
    label: 'Quy chế đào tạo tín chỉ là gì?',
    category: 'DEFINITION',
  },
  {
    icon: 'compare_arrows',
    label: 'So sánh tiêu chuẩn môn lý thuyết và môn thực hành',
    category: 'COMPARISON',
  },
  {
    icon: 'summarize',
    label: 'Tóm tắt điều kiện và quy trình xét tốt nghiệp',
    category: 'SUMMARY',
  },
  {
    icon: 'psychology',
    label: 'Tại sao cần nộp chứng chỉ ngoại ngữ trước học kỳ 8?',
    category: 'REASONING',
  },
];

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({ onSelectPrompt }) => {
  return (
    <div className="chat-welcome">
      <div className="chat-welcome__hero">
        <div className="chat-welcome__avatar">
          <span className="material-symbols-outlined">school</span>
        </div>
        <h2 className="chat-welcome__title">Hỏi đáp Tri thức UniChat AI</h2>
        <p className="chat-welcome__desc">
          Hệ thống suy luận RAG truy xuất chính xác từ các tài liệu được cấp quyền trong Workspace của bạn.
        </p>
      </div>

      <div className="chat-welcome__suggestions-zone">
        <div className="chat-welcome__suggestions-label">
          <span className="material-symbols-outlined">tips_and_updates</span>
          <span>Gợi ý câu hỏi phổ biến:</span>
        </div>

        <div className="chat-welcome__grid">
          {SUGGESTED_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="chat-welcome__card"
              onClick={() => onSelectPrompt(item.label)}
            >
              <div className="chat-welcome__card-icon">
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              <div className="chat-welcome__card-content">
                <span className="chat-welcome__card-text">{item.label}</span>
                <span className="chat-welcome__card-tag">{item.category}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
