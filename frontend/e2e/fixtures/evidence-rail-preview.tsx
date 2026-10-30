import { createRoot } from 'react-dom/client';
import { ChatMessageItem } from '../../src/features/chat/components/chat-message-item';
import type { MessageItem } from '../../src/features/chat/components/chat-message-item';
import '../../src/styles/index.css';
import '../../src/features/chat/chat-page.css';

/**
 * An answered question with its sources, for working on the evidence rail.
 *
 * The rail cannot be designed against the running app: every stored answer in
 * the development database comes back redacted, because the authorisation
 * re-check that runs before a cached answer is returned finds the source
 * permissions have since changed. That is the gate doing its job. It also
 * means the only cited output available is the shape of one, so it is built
 * here — which costs no AI call and iterates in a reload.
 *
 * The excerpts and locators are written to match what the MongoDB workspace
 * actually holds, so the column widths are tested against real Vietnamese
 * text rather than lorem ipsum.
 */
const messages: MessageItem[] = [
  {
    id: 'user-1',
    role: 'USER',
    content: 'So sánh mô hình dữ liệu của MongoDB với PostgreSQL.',
  },
  {
    id: 'assistant-1',
    role: 'ASSISTANT',
    content:
      'MongoDB lưu dữ liệu dưới dạng tài liệu BSON trong các collection, không ' +
      'ràng buộc lược đồ cố định, nên hai tài liệu cùng một collection có thể ' +
      'mang những trường khác nhau. PostgreSQL lưu dữ liệu thành hàng trong các ' +
      'bảng có lược đồ khai báo trước, và mọi hàng trong một bảng đều mang đúng ' +
      'những cột đã khai báo.\n\n' +
      'Khác biệt này quyết định chỗ đặt công sức. Với MongoDB, việc kiểm tra tính ' +
      'hợp lệ của dữ liệu chuyển sang tầng ứng dụng; với PostgreSQL, lược đồ và ' +
      'các ràng buộc khóa ngoại giữ việc đó ở tầng cơ sở dữ liệu.\n\n' +
      'Về quan hệ, MongoDB khuyến khích nhúng tài liệu con vào trong tài liệu cha ' +
      'khi chúng luôn được đọc cùng nhau, thay cho phép JOIN mà PostgreSQL dùng.',
    thoughts: [
      {
        stepIndex: 1,
        stepKey: 'retrieval',
        title: 'Truy xuất bằng chứng',
        detail: 'Tìm thấy 3 đoạn liên quan trong 2 tài liệu được cấp quyền.',
      },
    ],
    response: {
      messageId: 'assistant-1',
      conversationId: 'conversation-1',
      decision: 'ANSWER',
      answer: null,
      intent: 'FACT',
      strategyVersion: 'v1',
      requestId: 'request-1',
      citations: [
        {
          citationId: 'c1',
          documentId: 'doc-mongo-co-ban',
          chunkId: 'chunk-24',
          fileName: 'MongoDB cơ bản.pdf',
          locator: 'page:24',
          score: 0.95,
          excerpt:
            'Mỗi bản ghi trong MongoDB là một tài liệu BSON. Các tài liệu trong ' +
            'cùng một collection không bắt buộc có cùng cấu trúc trường.',
        },
        {
          citationId: 'c2',
          documentId: 'doc-mongo-co-ban',
          chunkId: 'chunk-31',
          fileName: 'MongoDB cơ bản.pdf',
          locator: 'page:31',
          score: 0.88,
          excerpt:
            'Khi hai thực thể luôn được truy vấn cùng nhau, nên nhúng thực thể ' +
            'con vào tài liệu cha thay vì tham chiếu qua khóa.',
        },
        {
          citationId: 'c3',
          documentId: 'doc-he-quan-tri-csdl',
          chunkId: 'chunk-08',
          fileName: 'Hệ quản trị CSDL quan hệ.pdf',
          locator: 'page:8',
          score: 0.81,
          excerpt:
            'Lược đồ quan hệ khai báo trước cột và kiểu dữ liệu; ràng buộc khóa ' +
            'ngoại bảo đảm tính toàn vẹn tham chiếu ở tầng cơ sở dữ liệu.',
        },
      ],
    },
  },
];

const root = document.getElementById('root');
if (!root) throw new Error('Không tìm thấy phần tử root của bản xem trước.');
createRoot(root).render(
  <div className="chat-layout">
    <main className="chat-page">
      <div className="chat-page__main-content">
        <div className="chat-page__chat-area">
          <div className="chat-page__messages-body">
            {messages.map((message) => (
              <ChatMessageItem key={message.id} message={message} onAskCommunity={() => undefined} />
            ))}
          </div>
        </div>
      </div>
    </main>
  </div>,
);
