/**
 * REST API client for the community feed, stats, and bookmarks.
 */
import { fetchJson } from '../../lib/api-client';
import type { PostAttachment, ReactionSummary } from './community-api';

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
  reactions: ReactionSummary;
  /** Colour preset behind the post, null for an ordinary one. */
  backgroundKey: string | null;
  /** The reply the asker accepted, null while the question is open. */
  acceptedReplyId: string | null;
  isBookmarked: boolean;
  createdAt: string;
  attachments: PostAttachment[];
  /**
   * Whether the group's assistant has replied to this post.
   *
   * Optional because only a group's own post list reports it; the global feed
   * endpoint does not, and a card there simply omits the marker.
   */
  hasAiAnswer?: boolean;
}

export interface FeedPage {
  content: FeedPostResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
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
export type FeedScope = 'JOINED' | 'SAVED';
export type TopRange = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

export interface FeedParams {
  sort?: FeedSort;
  scope?: FeedScope;
  q?: string | undefined;
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
  if (params.range) sp.set('range', params.range);
  return fetchJson<FeedPage>(`/feed?${sp.toString()}`);
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

/**
 * Takes back the accepted answer, returning the question to the open set.
 *
 * Accepting used to be one-way, so a misclick was permanent and a better
 * answer arriving later could not take over.
 */
export async function clearAcceptedReply(
  workspaceId: string,
  discussionId: string,
): Promise<void> {
  await fetchJson(
    `/workspaces/${workspaceId}/discussions/${discussionId}/accept-reply`,
    { method: 'DELETE' },
  );
}

