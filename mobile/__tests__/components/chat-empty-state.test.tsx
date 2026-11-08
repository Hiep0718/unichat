import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ChatEmptyState } from '../../src/features/chat/components/chat-empty-state';

const WS = '0193a1f0-aaaa-7000-8000-00000000000a';

describe('ChatEmptyState', () => {
  it('invites questions about the group’s knowledge and shows readiness', async () => {
    const screen = await render(
      <ChatEmptyState workspaceId={WS} workspaceName="Mongodb" readiness={{ ready: 5, total: 6 }} suggestions={[]} onSelectPrompt={jest.fn()} />,
    );

    expect(screen.getByText('Hỏi kho tri thức Mongodb')).toBeTruthy();
    expect(screen.getByText('5/6 tài liệu sẵn sàng')).toBeTruthy();
  });

  it('sends a suggestion when it is pressed', async () => {
    const onSelectPrompt = jest.fn();
    const screen = await render(
      <ChatEmptyState workspaceId={WS} workspaceName="Mongodb" readiness={null} suggestions={['Tóm tắt chương 1']} onSelectPrompt={onSelectPrompt} />,
    );

    await fireEvent.press(screen.getByTestId('starter-prompt-0'));

    expect(onSelectPrompt).toHaveBeenCalledWith('Tóm tắt chương 1');
    expect(screen.queryByTestId('readiness-pill')).toBeNull();
  });

  it('says plainly when no document is ready yet', async () => {
    const screen = await render(
      <ChatEmptyState workspaceId={WS} workspaceName="OOP" readiness={{ ready: 0, total: 2 }} suggestions={[]} onSelectPrompt={jest.fn()} />,
    );

    expect(screen.getByText('Chưa có tài liệu sẵn sàng')).toBeTruthy();
    expect(screen.queryByText('GỢI Ý')).toBeNull();
  });
});
