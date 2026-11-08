import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ChatHeader } from '../../src/features/chat/components/chat-header';

describe('ChatHeader', () => {
  it('names the group being asked and the conversation title', async () => {
    const screen = await render(<ChatHeader workspaceName="Mongodb" title="Cuộc trò chuyện mới" onBack={jest.fn()} />);

    expect(screen.getByText('Mongodb')).toBeTruthy();
    expect(screen.getByText('Cuộc trò chuyện mới')).toBeTruthy();
  });

  it('wires back, group, history and new-chat actions', async () => {
    const handlers = { onBack: jest.fn(), onPickGroup: jest.fn(), onOpenHistory: jest.fn(), onNewChat: jest.fn() };
    const screen = await render(<ChatHeader workspaceName="Mongodb" title="t" {...handlers} />);

    await fireEvent.press(screen.getByTestId('chat-header-back'));
    await fireEvent.press(screen.getByTestId('chat-header-group'));
    await fireEvent.press(screen.getByTestId('chat-header-history'));
    await fireEvent.press(screen.getByTestId('chat-header-new'));

    Object.values(handlers).forEach((handler) => expect(handler).toHaveBeenCalledTimes(1));
  });

  it('says the assistant is answering and locks group switching while streaming', async () => {
    const onPickGroup = jest.fn();
    const screen = await render(<ChatHeader workspaceName="Mongodb" title="t" isStreaming onBack={jest.fn()} onPickGroup={onPickGroup} />);

    expect(screen.getByText('Trợ lý đang trả lời...')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-header-group'));
    expect(onPickGroup).not.toHaveBeenCalled();
  });

  it('hides history and new-chat buttons when no handler is given', async () => {
    const screen = await render(<ChatHeader workspaceName="Mongodb" title="t" onBack={jest.fn()} />);

    expect(screen.queryByTestId('chat-header-history')).toBeNull();
    expect(screen.queryByTestId('chat-header-new')).toBeNull();
  });
});
