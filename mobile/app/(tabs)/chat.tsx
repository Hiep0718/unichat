import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { workplace } from '../../src/design/tokens';
import { defaultGroup, groupHistory, splitGroups } from '../../src/features/chat/assistant-home';
import { conversationPath, newChatPath } from '../../src/features/chat/assistant-routes';
import { chatApi } from '../../src/features/chat/chat-api';
import { AssistantHero } from '../../src/features/chat/components/assistant-hero';
import { AssistantHistory } from '../../src/features/chat/components/assistant-history';
import { GroupPickerSheet } from '../../src/features/chat/components/group-picker-sheet';
import {
  ASSISTANT_KEY,
  useAssistantHistory,
  useAssistantWorkspaces,
  useGroupDocuments,
} from '../../src/features/chat/use-assistant-data';
import { countReady } from '../../src/features/documents/document-status';
import { useToast } from '../../src/lib/toast-context';

import type { HistoryEntry } from '../../src/features/chat/assistant-home';
import type { WorkspaceItem } from '../../src/features/workspaces/workspace-types';

/**
 * Màn Hỏi AI: hỏi ngay ở đầu màn, lịch sử ở dưới.
 *
 * Nhóm mặc định là nhóm vừa hỏi gần nhất. Người dùng đổi nhóm bằng bảng chọn,
 * và lịch sử lọc theo nhóm đó cho tới khi chọn "Xem mọi nhóm".
 */
export default function AssistantScreen() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const workspaces = useAssistantWorkspaces();
  const history = useAssistantHistory(workspaces.data);
  const entries = useMemo(() => history.data?.entries ?? [], [history.data]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [allGroups, setAllGroups] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const list = useMemo(() => workspaces.data ?? [], [workspaces.data]);
  const group = list.find((w) => w.id === pickedId) ?? defaultGroup(list, entries);
  const documents = useGroupDocuments(group?.id ?? null);
  const readiness = documents.data ? countReady(documents.data) : null;
  const groups = useMemo(() => splitGroups(list, entries), [list, entries]);

  const shown = allGroups || !group ? entries : entries.filter((entry) => entry.workspace.id === group.id);
  const sections = useMemo(() => groupHistory(shown), [shown]);

  const handlePick = useCallback((workspace: WorkspaceItem) => {
    setPickedId(workspace.id);
    setAllGroups(false);
    setPickerOpen(false);
  }, []);

  const handleDelete = useCallback((entry: HistoryEntry) => {
    Alert.alert('Xoá cuộc trò chuyện', `Xoá "${entry.conversation.title || 'Cuộc trò chuyện'}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => {
          chatApi.deleteConversation(entry.workspace.id, entry.conversation.id)
            .then(() => queryClient.invalidateQueries({ queryKey: [...ASSISTANT_KEY, 'history'] }))
            .then(() => showToast({ message: 'Đã xoá cuộc trò chuyện', type: 'success' }))
            .catch(() => showToast({ message: 'Không xoá được cuộc trò chuyện', type: 'error' }));
        },
      },
    ]);
  }, [queryClient, showToast]);

  const refresh = () => {
    void workspaces.refetch();
    void history.refetch();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={history.isRefetching} onRefresh={refresh} />}
    >
      <AssistantHero
        group={group}
        onPickGroup={() => setPickerOpen(true)}
        onNewChat={() => group && router.push(newChatPath(group.id) as never)}
        onAsk={(question) => group && router.push(newChatPath(group.id, question) as never)}
      />
      <AssistantHistory
        sections={sections}
        total={shown.length}
        scopeName={allGroups ? null : group?.name ?? null}
        loading={workspaces.isLoading || history.isLoading}
        failed={workspaces.isError || history.isError}
        failedGroups={history.data?.failedGroups ?? 0}
        onToggleScope={() => setAllGroups((value) => !value)}
        onOpen={(entry) => router.push(conversationPath(entry.workspace.id, entry.conversation.id) as never)}
        onDelete={handleDelete}
        onRetry={refresh}
      />
      <GroupPickerSheet
        visible={pickerOpen}
        recent={groups.recent}
        others={groups.others}
        selectedId={group?.id ?? null}
        selectedReadiness={readiness ? `${readiness.ready}/${readiness.total} tài liệu sẵn sàng` : undefined}
        onPick={handlePick}
        onClose={() => setPickerOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: workplace.canvas },
  content: { paddingBottom: 120 },
});
