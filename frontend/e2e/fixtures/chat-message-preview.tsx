import { createRoot } from 'react-dom/client';
import { ChatMessageItem } from '../../src/features/chat/components/chat-message-item';
import type { MessageItem } from '../../src/features/chat/components/chat-message-item';
import '../../src/styles/index.css';
import '../../src/features/chat/chat-page.css';

const messages: MessageItem[] = [
  { id: 'user-1', role: 'USER', content: 'Tóm tắt các ý chính có bằng chứng trong tài liệu.' },
  {
    id: 'assistant-1', role: 'ASSISTANT', content: 'Workspace chưa cho phép xử lý bằng AI.',
    thoughts: [{ stepIndex: 1, stepKey: 'retrieval', title: 'Kiểm tra bằng chứng', detail: 'Không có tài liệu được phép sử dụng.' }],
    response: {
      messageId: 'assistant-1', conversationId: 'conversation-1', decision: 'REFUSE',
      answer: null, intent: 'FACT', strategyVersion: 'v1', citations: [],
      refusalCode: 'EVIDENCE_INSUFFICIENT', refusalReason: 'Workspace chưa cho phép xử lý bằng AI.',
      requestId: 'request-1',
    },
  },
];

const root = document.getElementById('root');
if (!root) throw new Error('Không tìm thấy phần tử root của bản xem trước.');
createRoot(root).render(
  <div className="chat-layout"><main className="chat-page"><div className="chat-page__main-content">
    <div className="chat-page__chat-area"><div className="chat-page__messages-body">
      {messages.map((message) => <ChatMessageItem key={message.id} message={message} onAskCommunity={() => undefined} />)}
    </div></div>
  </div></main></div>,
);
