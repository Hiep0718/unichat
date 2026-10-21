import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatMessageItem } from './chat-message-item';
import type { MessageItem } from './chat-message-item';

afterEach(cleanup);

const refusalMessage: MessageItem = {
  id: 'assistant-1',
  role: 'ASSISTANT',
  content: 'Workspace chưa cho phép xử lý bằng AI.',
  thoughts: [{ stepIndex: 1, stepKey: 'evidence', title: 'Kiểm tra bằng chứng', detail: 'Không có tài liệu phù hợp.' }],
  response: {
    messageId: 'assistant-1', conversationId: 'conversation-1', decision: 'REFUSE', answer: null,
    intent: 'FACT', strategyVersion: 'v1', citations: [], refusalCode: 'NO_ALLOWED_DOCUMENTS',
    refusalReason: 'Workspace chưa cho phép xử lý bằng AI.', requestId: 'request-1',
  },
};

describe('ChatMessageItem', () => {
  it('should connect the refusal, thought steps and actions to the chat styles', () => {
    const onAskCommunity = vi.fn();
    const { container } = render(<ChatMessageItem message={refusalMessage} onAskCommunity={onAskCommunity} />);

    expect(container.querySelector('.chat-msg__ai-avatar-img')).toBeInTheDocument();
    expect(container.querySelector('.chat-msg__content-zone')).toBeInTheDocument();
    expect(screen.getByText('UniChat AI')).toHaveClass('chat-msg__author');
    expect(screen.getByText('Tiến trình xử lý').closest('summary')).toHaveClass('chat-thoughts__header');
    expect(container.querySelector('.chat-thoughts__step')).toBeInTheDocument();
    expect(container.querySelector('.chat-thoughts__step-node')).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: 'Sao chép câu trả lời' })).toHaveClass('chat-msg__action-btn');
    expect(screen.queryByRole('button', { name: 'Hỏi cộng đồng' })).not.toBeInTheDocument();
    expect(onAskCommunity).not.toHaveBeenCalled();
  });

  it('should style a document answer and keep note/citation actions usable', () => {
    const onSaveNote = vi.fn();
    const onSelectCitation = vi.fn();
    const citation = {
      documentId: 'document-1', fileName: 'Quy chế học tập.pdf', locator: 'page:3',
      excerpt: 'Nội dung đã xác minh', score: 0.95,
    };
    const message: MessageItem = {
      ...refusalMessage,
      content: 'Nội dung đã xác minh',
      response: {
        ...refusalMessage.response!, decision: 'ANSWER', answer: 'Nội dung đã xác minh',
        providerModel: 'deepseek-ai/deepseek-v4.1-flash',
        refusalCode: null, citations: [citation],
        sections: [{ type: 'DOCUMENT', content: 'Nội dung đã xác minh', claims: [] }],
      },
    };
    const { container } = render(<ChatMessageItem message={message} onSaveNote={onSaveNote} onSelectCitation={onSelectCitation} />);

    expect(container.querySelector('.chat-msg__markdown')).toBeInTheDocument();
    expect(screen.getByText('deepseek-ai/deepseek-v4.1-flash')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lưu vào Ghi chú/ })).toHaveClass('chat-msg__action-btn');
    fireEvent.click(screen.getByRole('button', { name: /Lưu vào Ghi chú/ }));
    fireEvent.click(screen.getByRole('button', { name: /Quy chế học tập.pdf/ }));

    expect(onSaveNote).toHaveBeenCalledWith('Ghi chú từ chat AI', message.content, message.id);
    expect(onSelectCitation).toHaveBeenCalledWith(citation);
  });

  it('should retain the community action for a genuine knowledge gap', () => {
    const onAskCommunity = vi.fn();
    const message = { ...refusalMessage, response: { ...refusalMessage.response!, refusalCode: 'EVIDENCE_INSUFFICIENT' } };
    render(<ChatMessageItem message={message} onAskCommunity={onAskCommunity} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hỏi cộng đồng' }));
    expect(onAskCommunity).toHaveBeenCalledWith(message);
  });

  it('should keep user messages right aligned without assistant actions', () => {
    const message: MessageItem = { id: 'user-1', role: 'USER', content: 'Tóm tắt các ý chính.' };
    const { container } = render(<ChatMessageItem message={message} />);

    expect(container.querySelector('.chat-msg--user .chat-msg__content-zone')).toBeInTheDocument();
    expect(screen.getByText('Bạn')).toHaveClass('chat-msg__author');
    expect(screen.queryByRole('button', { name: 'Sao chép câu trả lời' })).not.toBeInTheDocument();
  });

  it('should render the animated thinking bubble when the assistant is streaming without content', () => {
    const message: MessageItem = { id: 'assistant-pending', role: 'ASSISTANT', content: '', isStreaming: true };
    const { container } = render(<ChatMessageItem message={message} />);

    expect(container.querySelector('.chat-msg__bubble--thinking')).toBeInTheDocument();
    expect(container.querySelector('.chat-msg__thinking-dots')).toBeInTheDocument();
    expect(screen.getByText('UniChat AI đang suy nghĩ…')).toBeInTheDocument();
  });
});
