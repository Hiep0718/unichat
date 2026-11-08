/**
 * Danh sách cuộc trò chuyện, dùng chung giữa màn Tin nhắn và huy hiệu trên
 * thanh điều hướng qua cùng một khoá React Query.
 *
 * Socket chỉ là lời nhắc làm mới: mọi tin đều đã lưu trước khi được đẩy, nên
 * máy không kết nối được vẫn thấy đủ ở lần tải sau.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/auth-context';
import { useRealtimeSubscription } from '../realtime/realtime-provider';
import { messagesApi } from './messages-api';

import type { Conversation } from './messages-api';

export const CONVERSATIONS_KEY = ['work-chat', 'conversations'] as const;

/** Đích riêng của người dùng, do Spring định tuyến theo principal. */
export const MESSAGES_DESTINATION = '/user/queue/messages';
export const CONVERSATIONS_DESTINATION = '/user/queue/conversations';

/** Hàm buộc danh sách tải lại, cho nơi vừa làm nó đổi (gửi, đọc, mở mới). */
export function useInvalidateConversations(): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
  }, [queryClient]);
}

/** Danh sách cuộc trò chuyện, tự làm mới khi có tin hoặc nhóm thay đổi. */
export function useConversations() {
  const { isAuthenticated } = useAuth();
  const invalidate = useInvalidateConversations();

  useRealtimeSubscription(MESSAGES_DESTINATION, invalidate);
  useRealtimeSubscription(CONVERSATIONS_DESTINATION, invalidate);

  return useQuery<Conversation[]>({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => messagesApi.fetchConversations(),
    enabled: isAuthenticated,
  });
}
