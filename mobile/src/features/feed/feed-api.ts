/**
 * Lời gọi tới bảng tin cộng đồng: danh sách, lưu bài, cảm xúc, bình luận và
 * chấp nhận lời giải.
 *
 * Cùng các endpoint mà web dùng (`frontend/src/features/community`), nên một
 * bài lưu trên điện thoại hiện ngay trong mục "Đã lưu" của web và ngược lại.
 * Mọi tham số đều được kiểm tra trước khi rời máy.
 */
import { z } from 'zod';

import { fetchJson } from '../../lib/api-client';

import type {
  DiscussionDetail,
  FeedFilter,
  FeedPage,
  FeedStats,
  ReactionSummary,
  ReactionType,
  ReplyItem,
} from './feed-types';

export const FEED_PAGE_SIZE = 20;

/** Giới hạn phía client để khỏi gửi đi một bình luận vô lý; máy chủ vẫn kiểm. */
export const MAX_REPLY_LENGTH = 5000;

const idSchema = z.string().uuid('Mã không hợp lệ');
const pageSchema = z.number().int().min(0);
const replySchema = z
  .string()
  .trim()
  .min(1, 'Bình luận không được để trống')
  .max(MAX_REPLY_LENGTH, `Bình luận tối đa ${MAX_REPLY_LENGTH} ký tự`);
const reactionSchema = z.enum(['LIKE', 'LOVE', 'CARE', 'HAHA', 'WOW', 'SAD', 'ANGRY']);

/**
 * Tham số truy vấn cho một bộ lọc.
 *
 * "Đã lưu" là một phạm vi chứ không phải cách sắp: máy chủ trả danh sách bài
 * đã lưu bất kể `sort`, nên gửi kèm `NEW` cho rõ thay vì để nó trông như có tác
 * dụng.
 */
export function feedQueryFor(filter: FeedFilter): { sort: string; scope: string } {
  if (filter === 'SAVED') return { sort: 'NEW', scope: 'SAVED' };
  return { sort: filter, scope: 'JOINED' };
}

function discussionPath(workspaceId: string, discussionId: string): string {
  return `/workspaces/${idSchema.parse(workspaceId)}/discussions/${idSchema.parse(discussionId)}`;
}

/** Các lời gọi của bảng tin. */
export const feedApi = {
  /** Một trang bảng tin theo bộ lọc. */
  fetchFeed(filter: FeedFilter, page = 0): Promise<FeedPage> {
    const { sort, scope } = feedQueryFor(filter);
    const query = new URLSearchParams({
      sort,
      scope,
      page: String(pageSchema.parse(page)),
      size: String(FEED_PAGE_SIZE),
    });
    return fetchJson<FeedPage>(`/feed?${query.toString()}`);
  },

  /** Số bài và số câu hỏi chưa giải đáp trong các nhóm của người gọi. */
  fetchStats(): Promise<FeedStats> {
    return fetchJson<FeedStats>('/feed/stats');
  },

  /** Lưu hoặc bỏ lưu; trả trạng thái máy chủ đang giữ. */
  toggleBookmark(discussionId: string): Promise<{ bookmarked: boolean }> {
    return fetchJson<{ bookmarked: boolean }>(`/bookmarks/${idSchema.parse(discussionId)}`, {
      method: 'POST',
    });
  },

  /**
   * Thả, đổi hoặc gỡ cảm xúc. Chọn lại đúng loại đang có là gỡ.
   *
   * @returns bản tổng hợp mới của máy chủ, để hiện đúng số thay vì đoán
   */
  toggleReaction(
    targetType: 'DISCUSSION' | 'DISCUSSION_REPLY',
    targetId: string,
    reactionType: ReactionType,
  ): Promise<ReactionSummary> {
    const body = {
      targetType,
      targetId: idSchema.parse(targetId),
      reactionType: reactionSchema.parse(reactionType),
    };
    return fetchJson<ReactionSummary>('/reactions', { method: 'POST', body: JSON.stringify(body) });
  },

  /** Toàn bộ bài viết để đọc trong màn chi tiết. */
  getDiscussion(workspaceId: string, discussionId: string): Promise<DiscussionDetail> {
    return fetchJson<DiscussionDetail>(discussionPath(workspaceId, discussionId));
  },

  /** Mọi bình luận của bài, phẳng; cây được dựng ở client. */
  fetchReplies(workspaceId: string, discussionId: string): Promise<ReplyItem[]> {
    return fetchJson<ReplyItem[]>(`${discussionPath(workspaceId, discussionId)}/replies`);
  },

  /** Gửi bình luận, hoặc trả lời một bình luận khi có `parentReplyId`. */
  addReply(
    workspaceId: string,
    discussionId: string,
    body: string,
    parentReplyId?: string,
  ): Promise<ReplyItem> {
    const payload = {
      body: replySchema.parse(body),
      ...(parentReplyId ? { parentReplyId: idSchema.parse(parentReplyId) } : {}),
    };
    return fetchJson<ReplyItem>(`${discussionPath(workspaceId, discussionId)}/replies`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Người hỏi đánh dấu một bình luận là lời giải. */
  async acceptReply(workspaceId: string, discussionId: string, replyId: string): Promise<void> {
    const path = `${discussionPath(workspaceId, discussionId)}/accept-reply/${idSchema.parse(replyId)}`;
    await fetchJson<void>(path, { method: 'PUT' });
  },

  /** Gỡ lời giải, đưa câu hỏi về lại danh sách chưa giải đáp. */
  async clearAcceptedReply(workspaceId: string, discussionId: string): Promise<void> {
    await fetchJson<void>(`${discussionPath(workspaceId, discussionId)}/accept-reply`, {
      method: 'DELETE',
    });
  },
};

/** Bình luận có gọi trợ lý không, cùng quy tắc với web. */
export function mentionsAi(body: string): boolean {
  return /@ai\b/i.test(body);
}
