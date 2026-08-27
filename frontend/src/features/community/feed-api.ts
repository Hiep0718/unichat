import { fetchJson } from '../../lib/api-client';

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
  createdAt: string;
}

export interface FeedPage {
  content: FeedPostResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export async function fetchFeed(
  sort: 'HOT' | 'NEW' = 'HOT',
  scope: 'ALL' | 'JOINED' = 'JOINED',
  page = 0,
  size = 20
): Promise<FeedPage> {
  return fetchJson<FeedPage>(`/feed?sort=${sort}&scope=${scope}&page=${page}&size=${size}`);
}
