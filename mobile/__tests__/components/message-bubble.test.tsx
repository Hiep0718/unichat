import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MessageBubble, distinctDocuments } from '../../src/features/chat/components/message-bubble';
import { MessageItem } from '../../src/types/api';

describe('MessageBubble', () => {
  it('renders user message correctly', async () => {
    const userMsg: MessageItem = {
      id: 'msg-u1',
      conversationId: 'c1',
      sender: 'USER',
      content: 'Cho tôi biết định nghĩa về RAG?',
      createdAt: '2026-10-03T00:00:00Z',
    };

    const { getByText, getByTestId } = await render(<MessageBubble message={userMsg} />);

    expect(getByTestId('user-message-msg-u1')).toBeTruthy();
    expect(getByText('Cho tôi biết định nghĩa về RAG?')).toBeTruthy();
  });

  it('renders AI assistant message with markdown and citations', async () => {
    const aiMsg: MessageItem = {
      id: 'msg-a1',
      conversationId: 'c1',
      sender: 'ASSISTANT',
      content: 'RAG là **Retrieval-Augmented Generation**.',
      citations: [
        {
          citationId: 'cit-1',
          documentId: 'doc-1',
          fileName: 'GiaoTrinhAI.pdf',
          locator: 'Trang 45',
          excerpt: 'RAG kết hợp truy xuất văn bản và mô hình ngôn ngữ.',
          score: 0.95,
        },
      ],
      createdAt: '2026-10-03T00:00:01Z',
    };

    const onPressCitation = jest.fn();
    const { getByText, getByTestId } = await render(<MessageBubble message={aiMsg} onPressCitation={onPressCitation} />);

    expect(getByTestId('ai-message-msg-a1')).toBeTruthy();
    expect(getByText('Trợ lý AI')).toBeTruthy();
    expect(getByText('· dựa trên 1 tài liệu')).toBeTruthy();
    expect(getByText('GiaoTrinhAI.pdf')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();

    await fireEvent.press(getByTestId('citation-card-0'));
    expect(onPressCitation).toHaveBeenCalledWith(aiMsg.citations?.[0]);
  });

  it('counts distinct documents, not citations', () => {
    const cite = (documentId: string) => ({ documentId, locator: '', excerpt: '', score: 1 });

    expect(distinctDocuments([cite('a'), cite('a'), cite('b')])).toBe(2);
    expect(distinctDocuments([])).toBe(0);
  });

  it('should disclose missing web search when expanded evidence is unavailable', async () => {
    const aiMsg: MessageItem = {
      id: 'msg-a2',
      conversationId: 'c1',
      sender: 'ASSISTANT',
      content: 'Câu trả lời dựa trên tài liệu.',
      knowledgeMode: 'EXPANDED',
      warningMessage: 'Chưa cấu hình tìm kiếm web; câu trả lời hiện chỉ dựa trên tài liệu.',
      createdAt: '2026-10-03T00:00:01Z',
    };

    const { getByText } = await render(<MessageBubble message={aiMsg} />);

    expect(getByText(/Chưa cấu hình tìm kiếm web/)).toBeTruthy();
    expect(getByText('· có kiến thức ngoài')).toBeTruthy();
  });
});
