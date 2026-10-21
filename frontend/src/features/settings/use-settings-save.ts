import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../lib/api-client';
import { assertSessionGeneration, getSessionSnapshot } from '../../lib/session-store';
import { updateWorkspace } from '../workspaces/workspace-api';
import { updateWorkspaceSchema } from '../workspaces/workspace-schema';

import type { UpdateWorkspaceInput, WorkspaceDto } from '../workspaces/workspace-schema';

/** Minimal authoritative metadata consumed by settings forms on either route. */
export type SettingsWorkspace = Pick<WorkspaceDto,
  'id' | 'name' | 'description' | 'visibility' | 'cloudAllowed' | 'version'>;

/** Validates updates and synchronizes the returned version before the next save. */
export function useSettingsSave(workspaceId: string) {
  const queryClient = useQueryClient();
  const detailKey = ['workspaces', 'detail', workspaceId] as const;
  return useMutation({
    onMutate: () => getSessionSnapshot().generation,
    mutationFn: (input: UpdateWorkspaceInput) => updateWorkspace(workspaceId, updateWorkspaceSchema.parse(input)),
    onSuccess: async (workspace, _input, generation) => {
      assertSessionGeneration(generation);
      await queryClient.cancelQueries({ queryKey: detailKey });
      assertSessionGeneration(generation);
      queryClient.setQueryData(detailKey, workspace);
      void queryClient.invalidateQueries({ queryKey: ['workspaces'], predicate: (query) => query.queryKey[1] !== 'detail' });
    },
    onError: (error, _input, generation) => {
      if (generation !== getSessionSnapshot().generation) return;
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: detailKey });
      }
    },
  });
}

/** Converts mutation failures into safe, actionable messages without upstream details. */
export function settingsErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'Workspace đã thay đổi. Hãy kiểm tra cài đặt mới nhất rồi lưu lại.';
  }
  if (error instanceof ApiError && error.status === 403) return 'Bạn không có quyền thay đổi cài đặt này.';
  return 'Không thể lưu cài đặt. Vui lòng kiểm tra thông tin và thử lại.';
}
