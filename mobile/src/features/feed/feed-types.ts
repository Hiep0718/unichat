/**
 * Feed discussion item type definition.
 */
export interface DiscussionItem {
  id: string;
  title: string;
  body: string;
  authorName?: string;
  workspaceName?: string;
  label?: 'QUESTION' | 'DISCUSSION' | 'ANNOUNCEMENT' | 'NOTE';
  voteScore: number;
  replyCount: number;
  createdAt: string;
  hasAiAnswer?: boolean;
  pinned?: boolean;
}
