import {
  buildSuggestions,
  canAsk,
  defaultGroup,
  groupHistory,
  historyTime,
  splitGroups,
} from '../../../src/features/chat/assistant-home';
import { conversationPath, newChatPath } from '../../../src/features/chat/assistant-routes';
import { chatTitle } from '../../../src/features/chat/components/assistant-chat-view';

import type { HistoryEntry } from '../../../src/features/chat/assistant-home';
import type { ConversationItem, MessageItem } from '../../../src/types/api';
import type { DocumentItem, WorkspaceItem } from '../../../src/features/workspaces/workspace-types';

jest.mock('../../../src/features/chat/use-chat-stream', () => ({ useChatStream: jest.fn() }));

const NOW = new Date(2026, 10, 9, 22, 0).getTime();

function ws(id: string, documentCount = 3): WorkspaceItem {
  return { id, name: `Nhóm ${id}`, visibility: 'PRIVATE', documentCount, memberCount: 2 };
}

function entry(id: string, workspace: WorkspaceItem, at: Date): HistoryEntry {
  const conversation: ConversationItem = { id, workspaceId: workspace.id, title: id, createdAt: at.toISOString(), lastMessageAt: at.toISOString() };
  return { conversation, workspace };
}

function doc(name: string, status: DocumentItem['status'] = 'PROCESSED'): DocumentItem {
  return { id: name, name, mimeType: 'application/pdf', fileSizeBytes: 1, status, createdAt: '' };
}

describe('groupHistory', () => {
  it('splits by today, yesterday, this week and earlier, newest first', () => {
    const a = ws('a');
    const sections = groupHistory([
      entry('old', a, new Date(2026, 9, 1)),
      entry('today', a, new Date(2026, 10, 9, 21, 40)),
      entry('week', a, new Date(2026, 10, 4)),
      entry('yesterday', a, new Date(2026, 10, 8)),
    ], NOW);

    expect(sections.map((s) => [s.title, s.entries.map((e) => e.conversation.id)])).toEqual([
      ['Hôm nay', ['today']],
      ['Hôm qua', ['yesterday']],
      ['Tuần này', ['week']],
      ['Trước đó', ['old']],
    ]);
  });
});

describe('historyTime', () => {
  it('shows a clock today, a weekday this week and a date beyond', () => {
    expect(historyTime(new Date(2026, 10, 9, 21, 40).toISOString(), NOW)).toBe('21:40');
    expect(historyTime(new Date(2026, 10, 8, 9).toISOString(), NOW)).toBe('Hôm qua');
    expect(historyTime(new Date(2026, 10, 3, 9).toISOString(), NOW)).toBe('Thứ Ba');
    expect(historyTime(new Date(2026, 9, 1).toISOString(), NOW)).toBe('1/10');
  });
});

describe('group selection', () => {
  it('lists recently asked groups first and the rest after', () => {
    const [a, b, c] = [ws('a'), ws('b'), ws('c')];
    const history = [entry('1', b, new Date(2026, 10, 9)), entry('2', a, new Date(2026, 10, 1))];

    const { recent, others } = splitGroups([a, b, c], history);

    expect(recent.map((w) => w.id)).toEqual(['b', 'a']);
    expect(others.map((w) => w.id)).toEqual(['c']);
  });

  it('defaults to the last group asked, else the first group with documents', () => {
    const [empty, full, other] = [ws('empty', 0), ws('full'), ws('other')];

    expect(defaultGroup([empty, full, other], [entry('1', other, new Date())])?.id).toBe('other');
    expect(defaultGroup([empty, full], [])?.id).toBe('full');
    expect(defaultGroup([], [])).toBeNull();
    expect(canAsk(empty)).toBe(false);
  });
});

describe('buildSuggestions', () => {
  it('summarises ready documents first, without file extensions', () => {
    const suggestions = buildSuggestions([doc('01_Chapter_Data_Modeling.pdf'), doc('dang-xu-ly.pdf', 'PROCESSING')]);

    expect(suggestions[0]).toBe('Tóm tắt nội dung chính của "01 Chapter Data Modeling"');
    expect(suggestions).toHaveLength(4);
    expect(suggestions.join(' ')).not.toContain('dang xu ly');
  });
});

describe('chat routes and titles', () => {
  it('builds paths and carries a question safely encoded', () => {
    expect(newChatPath('w')).toBe('/workspace/w/chat');
    expect(newChatPath('w', 'a & b?')).toBe('/workspace/w/chat?q=a%20%26%20b%3F');
    expect(conversationPath('w', 'c')).toBe('/workspace/w/chat/c');
  });

  it('titles the chat by its first question', () => {
    const user = { id: 'u', conversationId: 'c', sender: 'USER', content: ' Embed hay reference? ', createdAt: '' } as MessageItem;

    expect(chatTitle([user], false)).toBe('Embed hay reference?');
    expect(chatTitle([], false)).toBe('Cuộc trò chuyện mới');
    expect(chatTitle([], true)).toBe('Cuộc trò chuyện');
  });
});
