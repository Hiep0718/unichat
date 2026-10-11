import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChatHeader } from '../../src/features/chat/components/chat-header';

describe('ChatHeader', () => {
  it('renders workspace title and document count', () => {
    const onBack = jest.fn();
    const { getByText } = render(
      <ChatHeader
        workspaceName="Hệ thống Phân tán"
        documentCount={5}
        onBack={onBack}
      />
    );

    expect(getByText('Hệ thống Phân tán')).toBeTruthy();
    expect(getByText('RAG Sẵn sàng • 5 tài liệu')).toBeTruthy();
  });

  it('triggers onBack when back button pressed', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <ChatHeader
        workspaceName="Hệ thống Phân tán"
        onBack={onBack}
      />
    );

    fireEvent.press(getByTestId('chat-header-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('displays streaming state when isStreaming is true', () => {
    const onBack = jest.fn();
    const { getByText } = render(
      <ChatHeader
        workspaceName="Hệ thống Phân tán"
        onBack={onBack}
        isStreaming
      />
    );

    expect(getByText('AI đang suy luận...')).toBeTruthy();
  });
});
