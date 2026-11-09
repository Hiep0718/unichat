/**
 * Đường dẫn tới màn chi tiết một bài viết.
 */
import type { FeedPost } from './feed-types';

/**
 * Trạng thái lưu đi kèm trong đường dẫn vì endpoint chi tiết không báo nó;
 * bỏ trống (như từ danh sách của một nhóm) thì màn chi tiết ẩn nút lưu.
 */
export function postPath(post: Pick<FeedPost, 'id' | 'workspaceId'> & { isBookmarked?: boolean }): string {
  const base = `/post/${post.workspaceId}/${post.id}`;
  if (post.isBookmarked === undefined) return base;
  return `${base}?saved=${post.isBookmarked ? '1' : '0'}`;
}
