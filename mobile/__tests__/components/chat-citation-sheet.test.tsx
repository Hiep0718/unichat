import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChatCitationSheet } from '../../src/features/chat/components/chat-citation-sheet';

describe('ChatCitationSheet', () => {
  it('renders citation details when open', async () => {
    const citation = {
      documentId: 'd-1',
      fileName: 'KienTrucMayTinh.pdf',
      locator: 'Trang 24, Đoạn 2',
      excerpt: 'Mô hình Von Neumann bao gồm CPU và bộ nhớ chính.',
      score: 0.95,
    };
    const onClose = jest.fn();

    const { getByText } = await render(
      <ChatCitationSheet citation={citation} onClose={onClose} />
    );

    expect(getByText('KienTrucMayTinh.pdf')).toBeTruthy();
    expect(getByText('Vị trí: Trang 24, Đoạn 2')).toBeTruthy();
    expect(getByText('Độ liên quan: 95%')).toBeTruthy();
    expect(
      getByText('"Mô hình Von Neumann bao gồm CPU và bộ nhớ chính."')
    ).toBeTruthy();

    await fireEvent.press(getByText('KienTrucMayTinh.pdf'));
  });

  it('renders nothing when citation is null', async () => {
    const { toJSON } = await render(
      <ChatCitationSheet citation={null} onClose={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });
});
