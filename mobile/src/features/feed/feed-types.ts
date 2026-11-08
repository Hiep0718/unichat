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

/** Nguồn trợ lý đã dựa vào, lưu cùng câu trả lời của nó. */
export interface ReplyCitation {
  citationId: string;
  documentId: string | null;
  fileName: string;
  locator: string | null;
  excerpt: string;
}

/** Một bình luận, có thể lồng dưới bình luận khác qua `parentReplyId`. */
export interface ReplyItem {
  id: string;
  discussionId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  parentReplyId: string | null;
  isAiAnswer: boolean;
  createdAt: string;
  voteScore: number;
  reactions: ReactionSummary;
  /** Rỗng với bình luận của người. */
  citations: ReplyCitation[];
}

/**
 * Bài viết như endpoint chi tiết trả về.
 *
 * Không có `isBookmarked`: Core API chỉ báo trường này trên bảng tin, nên màn
 * chi tiết nhận trạng thái lưu từ danh sách đã mở nó.
 */
export interface DiscussionDetail {
  id: string;
  workspaceId: string;
  workspaceName: string | null;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  label: PostLabel | null;
  pinned: boolean;
  replyCount: number;
  createdAt: string;
  editedAt: string | null;
  reactions: ReactionSummary;
  backgroundKey: string | null;
  acceptedReplyId: string | null;
  hasAiAnswer: boolean;
  attachments: PostAttachment[];
}

/** Bốn cách xem bảng tin; ba cái đầu là cách sắp, cái cuối là bài đã lưu. */
export type FeedFilter = 'NEW' | 'UNANSWERED' | 'MINE' | 'SAVED';

export interface FeedPage {
  content: FeedPost[];
  number: number;
  totalPages: number;
  last?: boolean;
}

/** Số liệu bảng tin, đếm trong các nhóm người dùng đang tham gia. */
export interface FeedStats {
  totalPosts: number;
  /** Câu hỏi chưa có lời giải: con số đáng hành động nhất. */
  unansweredCount: number;
}
