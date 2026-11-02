/**
 * The shape the feed endpoint actually returns.
 *
 * Mirrors FeedPostResponse in core-api and on the web. The mobile client used
 * to declare a narrower, partly invented shape — no group id, no reactions,
 * no accepted reply, plus a `hasAiAnswer` flag and a `NOTE` label the server
 * has never sent — so the card threw away most of what it was given and had
 * nothing to draw the group's mark or the resolution state from.
 */

export type ReactionType =
  | 'LIKE'
  | 'LOVE'
  | 'CARE'
  | 'HAHA'
  | 'WOW'
  | 'SAD'
  | 'ANGRY';

export interface ReactionSummary {
  /** Counts keyed by type, omitting types nobody used. */
  counts: Partial<Record<ReactionType, number>>;
  total: number;
  /** The current user's reaction, null when they left none. */
  myReaction: ReactionType | null;
}

export interface PostAttachment {
  id: string;
  kind: string;
  originalName: string;
  mediaType: string;
  byteSize: number;
}

export type PostLabel = 'QUESTION' | 'DISCUSSION' | 'ANNOUNCEMENT';

export interface FeedPost {
  id: string;
  workspaceId: string;
  workspaceName: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  title: string;
  body: string;
  label: PostLabel;
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
   * Trợ lý của nhóm đã trả lời bài này chưa.
   *
   * Không bắt buộc vì chỉ danh sách bài của một nhóm báo về trường này; bảng
   * tin toàn cục thì không, và thẻ ở đó đơn giản là không vẽ dải.
   */
  hasAiAnswer?: boolean;
  /** Bài được ghim lên đầu danh sách của nhóm. */
  pinned?: boolean;
}
