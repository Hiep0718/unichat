import type { DocumentResponse } from '../../documents/document-api';

import './chat-welcome.css';

interface ChatWelcomeProps {
  workspaceName?: string | undefined;
  documents?: DocumentResponse[] | undefined;
  onSelectPrompt: (prompt: string) => void;
}

/**
 * Bốn cách mở đầu một cuộc hỏi.
 *
 * Mỗi mục có một nhãn ngắn và một câu hỏi đầy đủ. Nhãn là thứ mắt quét qua;
 * câu hỏi là thứ được gửi đi. Trước đây vai trò đó do một biểu tượng trong ô
 * vuông nhuộm màu đảm nhiệm, mà một biểu tượng thì không nói được "so sánh"
 * khác "tóm tắt" ở chỗ nào.
 */
const PROMPTS = [
  { tag: 'Giải thích', label: 'Giải thích một khái niệm trong tài liệu và chỉ rõ nguồn trích dẫn.' },
  { tag: 'So sánh', label: 'So sánh các phương pháp được trình bày trong tài liệu.' },
  { tag: 'Tóm tắt', label: 'Tóm tắt các ý chính có bằng chứng trong tài liệu.' },
  { tag: 'Phân tích', label: 'Phân tích một vấn đề dựa trên bằng chứng trong tài liệu.' },
] as const;

/**
 * Màn mở đầu của một cuộc hội thoại, khi chưa có tin nhắn nào.
 *
 * Không suy đoán nội dung kho tài liệu từ tên tệp: chỉ nói có bao nhiêu tệp
 * đang nằm trong phạm vi, và giao kèo mà câu trả lời phải tuân theo.
 */
export function ChatWelcome({
  workspaceName = 'Kho tri thức',
  documents = [],
  onSelectPrompt,
}: ChatWelcomeProps) {
  const count = documents.length;

  return (
    <div className="chat-welcome">
      <h1 className="chat-welcome__title">{workspaceName}</h1>

      <p className="chat-welcome__contract">
        Hỏi bất cứ điều gì về {count} tài liệu trong phạm vi này. Mỗi câu trả lời
        đều kèm bằng chứng từ nguồn bạn được phép truy cập — và khi bằng chứng
        không đủ, hệ thống nói thẳng là chưa trả lời được.
      </p>

      <div className="chat-welcome__prompts">
        {PROMPTS.map((item) => (
          <button
            key={item.tag}
            type="button"
            className="chat-welcome__prompt"
            onClick={() => onSelectPrompt(item.label)}
          >
            <span className="chat-welcome__prompt-tag">{item.tag}</span>
            <span className="chat-welcome__prompt-text">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
