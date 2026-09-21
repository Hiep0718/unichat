/**
 * REST API client for the community feed, trending tags, stats, and bookmarks.
 */
import { fetchJson } from '../../lib/api-client';
import type { PostAttachment } from './community-api';

/* ---------- Types ---------- */

export interface FeedPostResponse {
  id: string;
  workspaceId: string;
  workspaceName: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  title: string;
  body: string;
  label: 'QUESTION' | 'DISCUSSION' | 'ANNOUNCEMENT';
  voteScore: number;
  replyCount: number;
  userVote: string | null;
  tags: string[];
  hasAcceptedAnswer: boolean;
  isBookmarked: boolean;
  createdAt: string;
  attachments: PostAttachment[];
}

export interface FeedPage {
  content: FeedPostResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface TrendingTag {
  tag: string;
  count: number;
}

export interface FeedStats {
  totalPosts: number;
  /** Questions with no accepted answer yet — the actionable number. */
  unansweredCount: number;
}

/* ---------- Feed ---------- */

/**
 * Task-oriented views. Replaced Reddit's HOT/TOP ranking, which needs a scale
 * this product does not have and hid the only signal that matters: whether a
 * question still needs an answer.
 */
export type FeedSort = 'UNANSWERED' | 'NEW' | 'MINE';
export type FeedScope = 'ALL' | 'JOINED' | 'SAVED';
export type TopRange = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

export interface FeedParams {
  sort?: FeedSort;
  scope?: FeedScope;
  q?: string | undefined;
  tag?: string | undefined;
  range?: TopRange | undefined;
  page?: number;
  size?: number;
}

export async function fetchFeed(params: FeedParams = {}): Promise<FeedPage> {
  const sp = new URLSearchParams();
  sp.set('sort', params.sort ?? 'NEW');
  sp.set('scope', params.scope ?? 'JOINED');
  sp.set('page', String(params.page ?? 0));
  sp.set('size', String(params.size ?? 20));
  if (params.q) sp.set('q', params.q);
  if (params.tag) sp.set('tag', params.tag);
  if (params.range) sp.set('range', params.range);
  return fetchJson<FeedPage>(`/feed?${sp.toString()}`);
}

/* ---------- Trending Tags ---------- */

export async function fetchTrendingTags(limit = 10): Promise<TrendingTag[]> {
  return fetchJson<TrendingTag[]>(`/feed/trending-tags?limit=${limit}`);
}

/* ---------- Stats ---------- */

export async function fetchFeedStats(): Promise<FeedStats> {
  return fetchJson<FeedStats>('/feed/stats');
}

/* ---------- Bookmarks ---------- */

export async function toggleBookmark(
  discussionId: string
): Promise<{ bookmarked: boolean }> {
  return fetchJson<{ bookmarked: boolean }>(`/bookmarks/${discussionId}`, {
    method: 'POST',
  });
}

/* ---------- Accept Reply ---------- */

export async function acceptReply(
  workspaceId: string,
  discussionId: string,
  replyId: string
): Promise<void> {
  await fetchJson(
    `/workspaces/${workspaceId}/discussions/${discussionId}/accept-reply/${replyId}`,
    { method: 'PUT' }
  );
}
