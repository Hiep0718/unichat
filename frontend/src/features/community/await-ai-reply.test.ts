import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { awaitAiReply, mentionsAi } from './await-ai-reply';
import * as communityApi from './community-api';

import type { ReplyResponse } from './community-api';

vi.mock('./community-api', () => ({
  fetchReplies: vi.fn(),
}));

/** A reply with only the fields the wait looks at filled in meaningfully. */
function reply(overrides: Partial<ReplyResponse>): ReplyResponse {
  return {
    id: 'reply-1',
    parentReplyId: null,
    isAiAnswer: false,
    ...overrides,
  } as ReplyResponse;
}

describe('mentionsAi', () => {
  it.each(['@AI giải thích giúp', 'hỏi @ai nhé', '(@Ai) là gì?', 'cảm ơn @AI.'])(
    'calls the assistant for a standalone handle: %s',
    (body) => {
      expect(mentionsAi(body)).toBe(true);
    },
  );

  it.each(['gửi x@ai.edu.vn', '@aiden xem giúp', '@ai_team', '@ai.edu.vn', 'không nhắc ai'])(
    'ignores text that only contains the handle: %s',
    (body) => {
      expect(mentionsAi(body)).toBe(false);
    },
  );
});

describe('awaitAiReply', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the assistant answer to the asking comment once it appears', async () => {
    // Arrange
    const answer = reply({ id: 'ai-1', isAiAnswer: true, parentReplyId: 'trigger' });
    vi.mocked(communityApi.fetchReplies)
      .mockResolvedValueOnce([reply({ id: 'trigger' })])
      .mockResolvedValueOnce([reply({ id: 'trigger' }), answer]);

    // Act
    const waiting = awaitAiReply('ws', 'post', 'trigger');
    await vi.advanceTimersByTimeAsync(4000);

    // Assert
    await expect(waiting).resolves.toEqual(answer);
  });

  it('keeps waiting past one minute because the server allows four', async () => {
    // Arrange: the answer only lands after ninety seconds.
    const answer = reply({ id: 'ai-1', isAiAnswer: true, parentReplyId: 'trigger' });
    const started = Date.now();
    vi.mocked(communityApi.fetchReplies).mockImplementation(async () =>
      Date.now() - started >= 90_000 ? [answer] : [],
    );

    // Act
    const waiting = awaitAiReply('ws', 'post', 'trigger');
    await vi.advanceTimersByTimeAsync(95_000);

    // Assert
    await expect(waiting).resolves.toEqual(answer);
  });

  it('gives up with null after the server deadline has passed', async () => {
    // Arrange
    vi.mocked(communityApi.fetchReplies).mockResolvedValue([]);

    // Act
    const waiting = awaitAiReply('ws', 'post', 'trigger');
    await vi.advanceTimersByTimeAsync(241_000);

    // Assert
    await expect(waiting).resolves.toBeNull();
  });

  it('stops without fetching once the reader has left', async () => {
    // Act
    const waiting = awaitAiReply('ws', 'post', 'trigger', () => true);
    await vi.advanceTimersByTimeAsync(2000);

    // Assert
    await expect(waiting).resolves.toBeNull();
    expect(communityApi.fetchReplies).not.toHaveBeenCalled();
  });
});
