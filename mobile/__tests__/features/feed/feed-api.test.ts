import { FEED_PAGE_SIZE, MAX_REPLY_LENGTH, feedApi, feedQueryFor, mentionsAi } from '../../../src/features/feed/feed-api';
import { fetchJson } from '../../../src/lib/api-client';

jest.mock('../../../src/lib/api-client', () => ({ fetchJson: jest.fn() }));

const WS = '123e4567-e89b-12d3-a456-426614174000';
const POST = '223e4567-e89b-12d3-a456-426614174000';
const REPLY = '323e4567-e89b-12d3-a456-426614174000';
const BASE = `/workspaces/${WS}/discussions/${POST}`;

describe('feedQueryFor', () => {
  it('sends a sort within the member scope for the three views', () => {
    expect(feedQueryFor('NEW')).toEqual({ sort: 'NEW', scope: 'JOINED' });
    expect(feedQueryFor('UNANSWERED')).toEqual({ sort: 'UNANSWERED', scope: 'JOINED' });
    expect(feedQueryFor('MINE')).toEqual({ sort: 'MINE', scope: 'JOINED' });
  });

  it('asks for the saved scope for bookmarks, the list the web reads too', () => {
    expect(feedQueryFor('SAVED')).toEqual({ sort: 'NEW', scope: 'SAVED' });
  });
});

describe('feedApi', () => {
  const request = jest.mocked(fetchJson);

  beforeEach(() => {
    jest.clearAllMocks();
    request.mockResolvedValue(undefined);
  });

  it('pages the feed with the filter in the query', async () => {
    await feedApi.fetchFeed('SAVED', 2);

    expect(request).toHaveBeenCalledWith(`/feed?sort=NEW&scope=SAVED&page=2&size=${FEED_PAGE_SIZE}`);
  });

  it('toggles a bookmark on the shared endpoint', async () => {
    await feedApi.toggleBookmark(POST);

    expect(request).toHaveBeenCalledWith(`/bookmarks/${POST}`, { method: 'POST' });
  });

  it('posts a reaction for a post or a reply', async () => {
    await feedApi.toggleReaction('DISCUSSION_REPLY', REPLY, 'HAHA');

    expect(request).toHaveBeenCalledWith('/reactions', {
      method: 'POST',
      body: JSON.stringify({ targetType: 'DISCUSSION_REPLY', targetId: REPLY, reactionType: 'HAHA' }),
    });
  });

  it('reads a post and its replies', async () => {
    await feedApi.getDiscussion(WS, POST);
    await feedApi.fetchReplies(WS, POST);

    expect(request).toHaveBeenNthCalledWith(1, BASE);
    expect(request).toHaveBeenNthCalledWith(2, `${BASE}/replies`);
  });

  it('sends a trimmed comment, with its parent when replying', async () => {
    await feedApi.addReply(WS, POST, '  hay quá  ');
    await feedApi.addReply(WS, POST, 'đồng ý', REPLY);

    expect(request).toHaveBeenNthCalledWith(1, `${BASE}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body: 'hay quá' }),
    });
    expect(request).toHaveBeenNthCalledWith(2, `${BASE}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body: 'đồng ý', parentReplyId: REPLY }),
    });
  });

  it('accepts and clears an answer', async () => {
    await feedApi.acceptReply(WS, POST, REPLY);
    await feedApi.clearAcceptedReply(WS, POST);

    expect(request).toHaveBeenNthCalledWith(1, `${BASE}/accept-reply/${REPLY}`, { method: 'PUT' });
    expect(request).toHaveBeenNthCalledWith(2, `${BASE}/accept-reply`, { method: 'DELETE' });
  });

  it('rejects invalid input before any request leaves the device', () => {
    expect(() => feedApi.addReply(WS, POST, '   ')).toThrow('không được để trống');
    expect(() => feedApi.addReply(WS, POST, 'a'.repeat(MAX_REPLY_LENGTH + 1))).toThrow('tối đa');
    expect(() => feedApi.getDiscussion('../admin', POST)).toThrow('không hợp lệ');
    expect(() => feedApi.toggleBookmark('nope')).toThrow();
    expect(() => feedApi.toggleReaction('DISCUSSION', POST, 'BOO' as never)).toThrow();
    expect(() => feedApi.fetchFeed('NEW', -1)).toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});

describe('mentionsAi', () => {
  it('spots an @AI mention regardless of case, but not inside a word', () => {
    expect(mentionsAi('@AI giải thích giúp')).toBe(true);
    expect(mentionsAi('hỏi @ai nhé')).toBe(true);
    expect(mentionsAi('email@aiden.vn')).toBe(false);
  });
});
