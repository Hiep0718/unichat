import type { DocumentResponse } from '../../documents/document-api';
import './chat-welcome.css';

interface ChatWelcomeProps {
  workspaceName?: string | undefined;
  documents?: DocumentResponse[] | undefined;
  onSelectPrompt: (prompt: string) => void;
}

const PROMPTS = [
  { icon: 'menu_book', label: 'Giải thích một khái niệm trong tài liệu và chỉ rõ nguồn trích dẫn.' },
  { icon: 'compare_arrows', label: 'So sánh các phương pháp được trình bày trong tài liệu.' },
  { icon: 'summarize', label: 'Tóm tắt các ý chính có bằng chứng trong tài liệu.' },
  { icon: 'psychology', label: 'Phân tích một vấn đề dựa trên bằng chứng trong tài liệu.' },
];

/** Offers document questions without inferring corpus contents from file names. */
export function ChatWelcome({ workspaceName = 'Kho tri thức', documents = [], onSelectPrompt }: ChatWelcomeProps) {
  return <div className="chat-welcome">
    <div className="chat-welcome__header"><h1 className="chat-welcome__title">Kho tri thức <span>{workspaceName}</span></h1>
      <div className="chat-welcome__meta">📚 {documents.length} tài liệu trong danh sách hiện tại</div></div>
    <div className="chat-welcome__overview"><p className="chat-welcome__overview-text">
      Đặt câu hỏi cụ thể về tài liệu. Câu trả lời cần có bằng chứng từ nguồn bạn được phép truy cập.
      Nếu thiếu bằng chứng, hệ thống sẽ yêu cầu làm rõ hoặc từ chối trả lời.</p></div>
    <div className="chat-welcome__suggestions-zone"><p>Gợi ý câu hỏi:</p><div className="chat-welcome__grid">
      {PROMPTS.map((item) => <button key={item.icon} type="button" className="chat-welcome__card" onClick={() => onSelectPrompt(item.label)}>
        <div className="chat-welcome__card-icon"><span className="material-symbols-outlined">{item.icon}</span></div>
        <span className="chat-welcome__card-text">{item.label}</span></button>)}
    </div></div>
  </div>;
}
