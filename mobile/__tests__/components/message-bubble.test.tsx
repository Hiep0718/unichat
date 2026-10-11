import React from 'react';
import { render } from '@testing-library/react-native';
import { MessageBubble } from '../../src/features/chat/components/message-bubble';
import { MessageItem } from '../../src/types/api';

describe('MessageBubble', () => {
  it('renders user message correctly', () => {
    const userMsg: MessageItem = {
      id: 'msg-u1',
      conversationId: 'c1',
      sender: 'USER',
      content: 'Cho tôi biết định nghĩa về RAG?',
      createdAt: '2026-10-03T00:00:00Z',
    };

    const { getByText, getByTestId } = render(<MessageBubble message={userMsg} />);

    expect(getByTestId('user-message-msg-u1')).toBeTruthy();
    expect(getByText('Cho tôi biết định nghĩa về RAG?')).toBeTruthy();
  });

  it('renders AI assistant message with markdown and citations', () => {
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

    const { getByText, getByTestId } = render(<MessageBubble message={aiMsg} />);

    expect(getByTestId('ai-message-msg-a1')).toBeTruthy();
    expect(getByText('UniChat AI')).toBeTruthy();
    expect(getByText(/GiaoTrinhAI.pdf/)).toBeTruthy();
    expect(getByText('95%')).toBeTruthy();
  });
});
