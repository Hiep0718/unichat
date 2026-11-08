/**
 * Trạng thái màn chi tiết một bài: nội dung, bình luận và các thao tác trên
 * chúng. Mọi thay đổi đều được ghi ngược vào cache bảng tin qua
 * {@link patchFeedPost}, nên quay lại danh sách là thấy ngay.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { feedApi, mentionsAi } from './feed-api';
import { patchFeedPost } from './use-feed';

import type { DiscussionDetail, ReactionSummary, ReplyItem } from './feed-types';

/** Trợ lý trả lời ngoài luồng; chờ quá lâu thì thôi làm mới và để người dùng kéo. */
export const AI_WAIT_MS = 120_000;
export const AI_POLL_MS = 5_000;

/** Đã có câu trả lời của trợ lý nào đến sau thời điểm bắt đầu chờ chưa. */
export function aiAnsweredSince(replies: readonly ReplyItem[] | undefined, since: number): boolean {
  return (replies ?? []).some((reply) => reply.isAiAnswer && Date.parse(reply.createdAt) >= since);
}

/** Quản lý một bài viết theo nhóm và id. */
export function usePostDetail(workspaceId: string, postId: string) {
  const queryClient = useQueryClient();
  const detailKey = useMemo(() => ['post', workspaceId, postId] as const, [workspaceId, postId]);
  const repliesKey = useMemo(() => [...detailKey, 'replies'] as const, [detailKey]);
  const [aiWaitSince, setAiWaitSince] = useState<number | null>(null);

  const detail = useQuery({ queryKey: detailKey, queryFn: () => feedApi.getDiscussion(workspaceId, postId) });
  const replies = useQuery({
    queryKey: repliesKey,
    queryFn: () => feedApi.fetchReplies(workspaceId, postId),
    refetchInterval: aiWaitSince === null ? false : AI_POLL_MS,
  });

  useEffect(() => {
    if (aiWaitSince === null) return;
    if (aiAnsweredSince(replies.data, aiWaitSince)) {
      setAiWaitSince(null);
      return;
    }
    const timer = setTimeout(() => setAiWaitSince(null), aiWaitSince + AI_WAIT_MS - Date.now());
    return () => clearTimeout(timer);
  }, [aiWaitSince, replies.data]);

  const patchDetail = useCallback((patch: Partial<DiscussionDetail>) => {
    queryClient.setQueryData<DiscussionDetail>(detailKey, (old) => (old ? { ...old, ...patch } : old));
  }, [queryClient, detailKey]);

  const addReply = useCallback(async (body: string, parentReplyId?: string) => {
    const created = await feedApi.addReply(workspaceId, postId, body, parentReplyId);
    const next = [...(queryClient.getQueryData<ReplyItem[]>(repliesKey) ?? []), created];
    queryClient.setQueryData<ReplyItem[]>(repliesKey, next);
    patchDetail({ replyCount: next.length });
    patchFeedPost(queryClient, postId, { replyCount: next.length });
    if (mentionsAi(body)) setAiWaitSince(Date.now());
  }, [queryClient, repliesKey, workspaceId, postId, patchDetail]);

  /** Chấp nhận một bình luận, hoặc gỡ khi chọn lại đúng bình luận đang được chấp nhận. */
  const toggleAccepted = useCallback(async (replyId: string) => {
    const clearing = detail.data?.acceptedReplyId === replyId;
    if (clearing) await feedApi.clearAcceptedReply(workspaceId, postId);
    else await feedApi.acceptReply(workspaceId, postId, replyId);
    const acceptedReplyId = clearing ? null : replyId;
    patchDetail({ acceptedReplyId });
    patchFeedPost(queryClient, postId, { acceptedReplyId });
  }, [detail.data?.acceptedReplyId, queryClient, workspaceId, postId, patchDetail]);

  const setPostReactions = useCallback((reactions: ReactionSummary) => {
    patchDetail({ reactions });
    patchFeedPost(queryClient, postId, { reactions });
  }, [queryClient, postId, patchDetail]);

  const setReplyReactions = useCallback((replyId: string, reactions: ReactionSummary) => {
    queryClient.setQueryData<ReplyItem[]>(repliesKey, (old) =>
      old?.map((reply) => (reply.id === replyId ? { ...reply, reactions } : reply)));
  }, [queryClient, repliesKey]);

  const refresh = useCallback(async () => {
    await Promise.all([detail.refetch(), replies.refetch()]);
  }, [detail, replies]);

  return {
    detail,
    replies,
    aiPending: aiWaitSince !== null,
    addReply,
    toggleAccepted,
    setPostReactions,
    setReplyReactions,
    refresh,
  };
}
