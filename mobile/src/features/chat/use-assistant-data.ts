/**
 * Dữ liệu cho màn Trợ lý AI và màn chat: các nhóm, lịch sử hỏi đáp của chúng
 * và tài liệu của một nhóm. Đặt trong React Query để màn chat đổi nhóm hay mở
 * bảng nguồn không phải tải lại thứ màn đầu vừa tải.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../auth/auth-context';
import { workspaceApi } from '../workspaces/workspace-api';
import { chatApi } from './chat-api';

import type { WorkspaceItem } from '../workspaces/workspace-types';
import type { HistoryEntry } from './assistant-home';

export const ASSISTANT_KEY = ['assistant'] as const;

/** Số cuộc trò chuyện gần nhất lấy về cho mỗi nhóm. */
const HISTORY_PER_GROUP = 20;

/** Các nhóm người dùng tham gia. */
export function useAssistantWorkspaces() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...ASSISTANT_KEY, 'workspaces'],
    queryFn: async () => (await workspaceApi.getWorkspaces({ page: 0, size: 100 })).content ?? [],
    enabled: isAuthenticated,
  });
}

export interface HistoryResult {
  readonly entries: HistoryEntry[];
  /** Số nhóm không tải được lịch sử, để báo thay vì im lặng thiếu dòng. */
  readonly failedGroups: number;
}

/**
 * Lịch sử hỏi đáp của mọi nhóm, mỗi nhóm một lời gọi chạy song song.
 *
 * Core API chỉ có danh sách theo từng nhóm, nên không gộp được ở máy chủ. Một
 * nhóm lỗi không làm hỏng cả danh sách; số nhóm lỗi được trả về để hiện.
 */
export function useAssistantHistory(workspaces: readonly WorkspaceItem[] | undefined) {
  const ids = useMemo(() => (workspaces ?? []).map((workspace) => workspace.id), [workspaces]);
  return useQuery<HistoryResult>({
    queryKey: [...ASSISTANT_KEY, 'history', ids],
    enabled: workspaces !== undefined,
    queryFn: async () => {
      const list = workspaces ?? [];
      const results = await Promise.allSettled(
        list.map((workspace) => chatApi.getConversations(workspace.id, { page: 0, size: HISTORY_PER_GROUP })),
      );
      const entries = results.flatMap((result, index) =>
        result.status === 'fulfilled'
          ? result.value.items.map((conversation) => ({ conversation, workspace: list[index] }))
          : []);
      return { entries, failedGroups: results.filter((result) => result.status === 'rejected').length };
    },
  });
}

/** Tài liệu của một nhóm, để đếm phần sẵn sàng, dựng gợi ý và mở bảng nguồn. */
export function useGroupDocuments(workspaceId: string | null) {
  return useQuery({
    queryKey: [...ASSISTANT_KEY, 'documents', workspaceId],
    queryFn: async () => (await workspaceApi.getWorkspaceDocuments(workspaceId as string, { page: 0, size: 100 })).content ?? [],
    enabled: workspaceId !== null,
  });
}
