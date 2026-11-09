import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ChatInputBar } from '../../../src/features/chat/components/chat-input-bar';
import { GroupPickerSheet } from '../../../src/features/chat/components/group-picker-sheet';
import { SourcesSheet } from '../../../src/features/chat/components/sources-sheet';

import type { DocumentItem, WorkspaceItem } from '../../../src/features/workspaces/workspace-types';

function ws(id: string, name: string, documentCount = 3): WorkspaceItem {
  return { id, name, visibility: 'PRIVATE', documentCount, memberCount: 2 };
}

describe('ChatInputBar', () => {
  it('sends in documents-only mode by default and clears the box', async () => {
    const onSend = jest.fn();
    const screen = await render(<ChatInputBar onSend={onSend} />);

    await fireEvent.changeText(screen.getByTestId('chat-text-input'), '  Embed là gì?  ');
    await fireEvent.press(screen.getByTestId('chat-send-button'));

    expect(onSend).toHaveBeenCalledWith('Embed là gì?', false);
    expect(screen.getByTestId('chat-text-input').props.value).toBe('');
  });

  it('sends with external knowledge once "Mở rộng" is chosen', async () => {
    const onSend = jest.fn();
    const screen = await render(<ChatInputBar onSend={onSend} />);

    await fireEvent.press(screen.getByTestId('mode-expanded'));
    await fireEvent.changeText(screen.getByTestId('chat-text-input'), 'So sánh REST và gRPC');
    await fireEvent.press(screen.getByTestId('chat-send-button'));

    expect(onSend).toHaveBeenCalledWith('So sánh REST và gRPC', true);
  });

  it('refuses questions shorter than the server accepts', async () => {
    const onSend = jest.fn();
    const screen = await render(<ChatInputBar onSend={onSend} />);

    await fireEvent.changeText(screen.getByTestId('chat-text-input'), 'hi');
    await fireEvent.press(screen.getByTestId('chat-send-button'));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows the source count and opens the source list', async () => {
    const onOpenSources = jest.fn();
    const screen = await render(<ChatInputBar onSend={jest.fn()} sourceCount={5} onOpenSources={onOpenSources} />);

    await fireEvent.press(screen.getByText('5 nguồn'));

    expect(onOpenSources).toHaveBeenCalled();
  });
});

describe('GroupPickerSheet', () => {
  it('groups recent and other groups, and marks the selected one', async () => {
    const screen = await render(
      <GroupPickerSheet visible recent={[ws('a', 'Mongodb')]} others={[ws('b', 'Quản lý dự án', 12)]} selectedId="a"
        selectedReadiness="5/6 tài liệu sẵn sàng" onPick={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.getByText('DÙNG GẦN ĐÂY')).toBeTruthy();
    expect(screen.getByText('NHÓM KHÁC')).toBeTruthy();
    expect(screen.getByText('5/6 tài liệu sẵn sàng')).toBeTruthy();
    expect(screen.getByText('12 tài liệu')).toBeTruthy();
  });

  it('does not let an empty group be picked', async () => {
    const onPick = jest.fn();
    const screen = await render(
      <GroupPickerSheet visible recent={[]} others={[ws('e', 'OOP', 0), ws('f', 'AI')]} selectedId={null} onPick={onPick} onClose={jest.fn()} />,
    );

    expect(screen.getByText('Chưa có tài liệu, chưa hỏi được')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('group-option-e'));
    await fireEvent.press(screen.getByTestId('group-option-f'));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'f' }));
  });
});

describe('SourcesSheet', () => {
  it('lists each document with its readiness', async () => {
    const docs: DocumentItem[] = [
      { id: '1', name: 'chuong-1.pdf', mimeType: 'application/pdf', fileSizeBytes: 1, status: 'PROCESSED', createdAt: '' },
      { id: '2', name: 'chuong-2.pdf', mimeType: 'application/pdf', fileSizeBytes: 1, status: 'FAILED', createdAt: '' },
    ];
    const screen = await render(<SourcesSheet visible workspaceName="Mongodb" documents={docs} loading={false} onClose={jest.fn()} />);

    expect(screen.getByText('Sẵn sàng cho AI')).toBeTruthy();
    expect(screen.getByText('Lỗi xử lý')).toBeTruthy();
  });
});
