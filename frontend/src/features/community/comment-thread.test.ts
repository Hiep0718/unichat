import { describe, expect, it } from 'vitest';

import { groupByParent, hiddenCount, isAssistantFallback, orderRoots, threadSize } from './comment-thread';

import type { ReplyResponse } from './community-api';

/** A reply with only the fields these rules look at filled in. */
function reply(id: string, parentReplyId: string | null = null, extra: Partial<ReplyResponse> = {}): ReplyResponse {
  return {
    id,
    discussionId: 'p1',
    parentReplyId,
    authorId: 'u1',
    authorName: 'An',
    authorAvatar: null,
    body: 'nội dung',
    isAiAnswer: false,
    voteScore: 0,
    reactions: { counts: {}, total: 0, myReaction: null },
    citations: [],
    createdAt: '2026-11-15T00:00:00Z',
    ...extra,
  };
}

describe('orderRoots', () => {
  it('should lift the accepted top-level reply to the front and keep the rest in order', () => {
    const roots = [reply('a'), reply('b'), reply('c')];

    expect(orderRoots(roots, 'c').map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('should leave the order alone when nothing at the top level is accepted', () => {
    const roots = [reply('a'), reply('b')];

    expect(orderRoots(roots, 'nested-one')).toBe(roots);
    expect(orderRoots(roots, null)).toBe(roots);
  });
});

describe('threadSize and hiddenCount', () => {
  const byParent = groupByParent([
    reply('a'), reply('b'), reply('b1', 'b'), reply('b1x', 'b1'), reply('c'),
  ]);

  it('should count a thread with every reply beneath it', () => {
    expect(threadSize('b', byParent)).toBe(3);
    expect(threadSize('a', byParent)).toBe(1);
  });

  it('should total what the collapsed view leaves out', () => {
    expect(hiddenCount([reply('b'), reply('c')], byParent)).toBe(4);
    expect(hiddenCount([], byParent)).toBe(0);
  });
});

describe('isAssistantFallback', () => {
  it('should recognise the sentence the server posts when the assistant fails', () => {
    const failed = reply('x', null, {
      isAiAnswer: true,
      body: 'Trợ lý chưa trả lời được lúc này. Bạn thử nhắc lại sau ít phút nhé.',
    });

    expect(isAssistantFallback(failed)).toBe(true);
  });

  it('should not mistake a real answer, or a person quoting the sentence, for it', () => {
    expect(isAssistantFallback(reply('y', null, { isAiAnswer: true, body: 'Index tốn bộ nhớ.' }))).toBe(false);
    expect(isAssistantFallback(reply('z', null, { body: 'Trợ lý chưa trả lời được lúc này.' }))).toBe(false);
  });
});
