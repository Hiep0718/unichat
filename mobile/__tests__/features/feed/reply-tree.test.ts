import { MAX_INDENT, buildReplyRows } from '../../../src/features/feed/reply-tree';
import { aiAnsweredSince } from '../../../src/features/feed/use-post-detail';

import type { ReplyItem } from '../../../src/features/feed/feed-types';

let clock = 0;

function reply(id: string, parentReplyId: string | null = null, overrides: Partial<ReplyItem> = {}): ReplyItem {
  clock += 1;
  return {
    id,
    discussionId: 'post',
    authorId: `author-${id}`,
    authorName: `Người ${id}`,
    authorAvatar: null,
    body: id,
    parentReplyId,
    isAiAnswer: false,
    createdAt: new Date(2026, 10, 8, 9, clock).toISOString(),
    voteScore: 0,
    reactions: { counts: {}, total: 0, myReaction: null },
    citations: [],
    ...overrides,
  };
}

describe('buildReplyRows', () => {
  it('puts each branch right after its root, in time order', () => {
    const a = reply('a');
    const b = reply('b');
    const a1 = reply('a1', 'a');

    const rows = buildReplyRows([b, a1, a]);

    expect(rows.map((row) => [row.reply.id, row.indent])).toEqual([['a', 0], ['a1', 1], ['b', 0]]);
  });

  it('caps the indent and names who a deep reply answers', () => {
    const chain = [reply('r0')];
    for (let depth = 1; depth <= MAX_INDENT + 2; depth += 1) {
      chain.push(reply(`r${depth}`, `r${depth - 1}`));
    }

    const rows = buildReplyRows(chain);
    const deepest = rows[rows.length - 1];

    expect(Math.max(...rows.map((row) => row.indent))).toBe(MAX_INDENT);
    expect(deepest.replyingTo).toBe(`Người r${MAX_INDENT + 1}`);
    expect(rows[1].replyingTo).toBeNull();
  });

  it('lifts a reply whose parent is gone to the top level instead of dropping it', () => {
    const rows = buildReplyRows([reply('orphan', 'deleted')]);

    expect(rows).toHaveLength(1);
    expect(rows[0].indent).toBe(0);
  });
});

describe('aiAnsweredSince', () => {
  it('detects an assistant answer that arrived after the wait began', () => {
    const since = Date.parse(new Date(2026, 10, 8, 9, 30).toISOString());
    const early = reply('old', null, { isAiAnswer: true, createdAt: new Date(2026, 10, 8, 9, 0).toISOString() });
    const late = reply('new', null, { isAiAnswer: true, createdAt: new Date(2026, 10, 8, 9, 31).toISOString() });

    expect(aiAnsweredSince([early], since)).toBe(false);
    expect(aiAnsweredSince([early, late], since)).toBe(true);
    expect(aiAnsweredSince(undefined, since)).toBe(false);
  });
});
