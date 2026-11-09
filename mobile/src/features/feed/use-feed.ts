/**
 * Bảng tin trong cache React Query, mỗi bộ lọc một khoá.
 *
 * Màn chi tiết sửa thẳng vào cache (cảm xúc, số bình luận, lời giải, trạng
 * thái lưu) thay vì bắt danh sách tải lại, nên quay về bảng tin vẫn đúng chỗ
 * đang đọc và đã thấy đúng số.
 */
import { useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/auth-context';
import { feedApi } from './feed-api';

import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { FeedFilter, FeedPage, FeedPost } from './feed-types';

export const FEED_KEY = ['feed'] as const;

/** Trang kế, hoặc undefined khi đã hết. */
export function nextPageOf(last: FeedPage): number | undefined {
  if (last.last === true) return undefined;
  return last.number + 1 < last.totalPages ? last.number + 1 : undefined;
}

/** Bảng tin theo bộ lọc, tải thêm khi cuộn tới cuối. */
export function useFeed(filter: FeedFilter) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: [...FEED_KEY, filter],
    queryFn: ({ pageParam }) => feedApi.fetchFeed(filter, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextPageOf,
    enabled: isAuthenticated,
  });
}

/** Mọi bài đã tải của một kết quả nhiều trang, bỏ trùng khi trang bị xê dịch. */
export function flattenFeed(data: InfiniteData<FeedPage> | undefined): FeedPost[] {
  const seen = new Set<string>();
  return (data?.pages ?? []).flatMap((page) => page.content).filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

/**
 * Sửa một bài ở mọi bộ lọc đang có trong cache.
 *
 * @param patch các trường đổi, hoặc hàm nhận bài cũ trả bài mới
 */
export function patchFeedPost(
  queryClient: QueryClient,
  postId: string,
  patch: Partial<FeedPost> | ((post: FeedPost) => Partial<FeedPost>),
): void {
  queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: FEED_KEY }, (data) => {
    if (!data) return data;
    const pages = data.pages.map((page) => ({
      ...page,
      content: page.content.map((post) => {
        if (post.id !== postId) return post;
        return { ...post, ...(typeof patch === 'function' ? patch(post) : patch) };
      }),
    }));
    return { ...data, pages };
  });
}

/**
 * Lưu hoặc bỏ lưu một bài, rồi đồng bộ cache.
 *
 * Danh sách "Đã lưu" được đánh dấu cũ để lần mở sau lấy đúng thứ tự máy chủ
 * (mới lưu lên đầu) thay vì tự chèn đoán vị trí. Lỗi được ném lại cho nơi gọi
 * báo người dùng.
 *
 * @returns trạng thái lưu máy chủ đang giữ
 */
export function useToggleBookmark(): (postId: string) => Promise<boolean> {
  const queryClient = useQueryClient();
  return useCallback(async (postId: string) => {
    const { bookmarked } = await feedApi.toggleBookmark(postId);
    patchFeedPost(queryClient, postId, { isBookmarked: bookmarked });
    void queryClient.invalidateQueries({ queryKey: [...FEED_KEY, 'SAVED'] });
    return bookmarked;
  }, [queryClient]);
}
