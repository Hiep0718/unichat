import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChatEmptyState } from '../../src/features/chat/components/chat-empty-state';

describe('ChatEmptyState', () => {
  it('renders hero title and starter prompts', () => {
    const onSelectPrompt = jest.fn();
    const { getByText, getByTestId } = render(
      <ChatEmptyState
        workspaceName="Toán Rời Rạc"
        onSelectPrompt={onSelectPrompt}
      />
    );

    expect(getByText('Hỏi đáp Trí thức AI')).toBeTruthy();
    expect(getByText('GỢI Ý CÂU HỎI BẮT ĐẦU')).toBeTruthy();

    const firstPrompt = getByTestId('starter-prompt-0');
    fireEvent.press(firstPrompt);

    expect(onSelectPrompt).toHaveBeenCalledWith(
      expect.stringContaining('Tóm tắt')
    );
  });

  it('renders referenced documents when provided', () => {
    const docs = [
      {
        id: 'doc-1',
        name: 'GiaoTrinh_ToanRoiRac.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        status: 'COMPLETED' as const,
        createdAt: '',
      },
    ];

    const { getByText } = render(
      <ChatEmptyState
        documents={docs}
        onSelectPrompt={jest.fn()}
      />
    );

    expect(getByText('TÀI LIỆU ĐANG THAM CHIẾU (1)')).toBeTruthy();
    expect(getByText('GiaoTrinh_ToanRoiRac.pdf')).toBeTruthy();
  });
});
