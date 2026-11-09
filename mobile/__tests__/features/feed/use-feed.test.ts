import { QueryClient } from '@tanstack/react-query';

import { postPath } from '../../../src/features/feed/post-route';
import { flattenFeed, nextPageOf, patchFeedPost } from '../../../src/features/feed/use-feed';

import type { InfiniteData } from '@tanstack/react-query';
import type { FeedPage, FeedPost } from '../../../src/features/feed/feed-types';

function post(id: string, overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id,
    workspaceId: 'ws',
    workspaceName: 'Nhóm',
    authorId: 'u',
    authorName: 'A',
    authorAvatar: null,
    title: id,
    body: '',
    label: 'QUESTION',
    voteScore: 0,
    replyCount: 0,
    reactions: { counts: {}, total: 0, myReaction: null },
    backgroundKey: null,
    acceptedReplyId: null,
    isBookmarked: false,
    createdAt: new Date().toISOString(),
    attachments: [],
    ...overrides,
  };
}

function pages(...lists: FeedPost[][]): InfiniteData<FeedPage> {
  return {
    pages: lists.map((content, number) => ({ content, number, totalPages: lists.length })),
    pageParams: lists.map((_, index) => index),
  };
}

describe('nextPageOf', () => {
  it('advances until the last page', () => {
    expect(nextPageOf({ content: [], number: 0, totalPages: 2 })).toBe(1);
    expect(nextPageOf({ content: [], number: 1, totalPages: 2 })).toBeUndefined();
    expect(nextPageOf({ content: [], number: 0, totalPages: 5, last: true })).toBeUndefined();
  });
});

describe('flattenFeed', () => {
  it('joins pages and drops a post repeated when the list shifted between pages', () => {
    const flat = flattenFeed(pages([post('a'), post('b')], [post('b'), post('c')]));

    expect(flat.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(flattenFeed(undefined)).toEqual([]);
  });
});

describe('patchFeedPost', () => {
  it('updates the post in every cached filter and leaves others untouched', () => {
    const client = new QueryClient();
    client.setQueryData(['feed', 'NEW'], pages([post('a'), post('b')]));
    client.setQueryData(['feed', 'SAVED'], pages([post('a')]));

    patchFeedPost(client, 'a', { isBookmarked: true });
    patchFeedPost(client, 'a', (old) => ({ replyCount: old.replyCount + 2 }));

    const fresh = client.getQueryData<InfiniteData<FeedPage>>(['feed', 'NEW'])?.pages[0].content;
    const saved = client.getQueryData<InfiniteData<FeedPage>>(['feed', 'SAVED'])?.pages[0].content;
    expect(fresh?.[0]).toMatchObject({ isBookmarked: true, replyCount: 2 });
    expect(fresh?.[1].isBookmarked).toBe(false);
    expect(saved?.[0].isBookmarked).toBe(true);
  });
});

describe('postPath', () => {
  it('carries the saved state only when it is known', () => {
    expect(postPath({ id: 'p', workspaceId: 'w', isBookmarked: true })).toBe('/post/w/p?saved=1');
    expect(postPath({ id: 'p', workspaceId: 'w', isBookmarked: false })).toBe('/post/w/p?saved=0');
    expect(postPath({ id: 'p', workspaceId: 'w' })).toBe('/post/w/p');
  });
});
