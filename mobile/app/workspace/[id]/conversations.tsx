import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UCScreenContainer } from '../../../src/components/uc-screen-container';
import { UCSkeletonList } from '../../../src/components/uc-skeleton';
import { chatApi } from '../../../src/features/chat/chat-api';
import { useConversationList } from '../../../src/features/chat/use-conversation-list';
import { ConversationListHeader } from '../../../src/features/chat/conversation-list-header';
import { ConversationListBody } from '../../../src/features/chat/conversation-list-body';
import { conversationListStyles as styles } from '../../../src/features/chat/conversation-list-styles';
import { getSessionSnapshot } from '../../../src/lib/session-store';
import type { ConversationItem } from '../../../src/types/api';

/** Remounts conversation state when its workspace binding changes. */
export default function WorkspaceConversationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ConversationListScreen key={id} workspaceId={id} />;
}
function ConversationListScreen({ workspaceId }: { workspaceId: string }) {
  const list = useConversationList(workspaceId);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const newChat = () => router.push(`/workspace/${workspaceId}/chat/index`);
  const remove = async (item: ConversationItem) => {
    const generation = getSessionSnapshot().generation;
    setDeletingId(item.id); setDeleteError(null);
    try { await chatApi.deleteConversation(workspaceId, item.id); if (generation === getSessionSnapshot().generation) await list.refresh(); }
    catch (error: unknown) { if (generation === getSessionSnapshot().generation) setDeleteError(error instanceof Error ? error.message : 'Không xóa được hội thoại.'); }
    finally { if (generation === getSessionSnapshot().generation) setDeletingId(null); }
  };
  const confirmDelete = (item: ConversationItem) => Alert.alert('Xóa cuộc hội thoại', `Bạn có chắc chắn muốn xóa "${item.title}"?`, [
    { text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => void remove(item) },
  ]);
  return <UCScreenContainer gradient={false}>
    <ConversationListHeader top={insets.top} name={list.workspace?.name} query={query} onQuery={setQuery} onBack={() => router.back()} onNew={newChat} />
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={list.loading && list.page >= 0} onRefresh={() => void list.refresh()} />}>
      {(list.error || deleteError) && <Text accessibilityRole="alert">{list.error || deleteError}</Text>}
      {list.loading && list.page < 0 ? <UCSkeletonList count={5} /> : <ConversationListBody items={list.items} query={query}
        deletingId={deletingId} onOpen={(id) => router.push(`/workspace/${workspaceId}/chat/${id}`)} onDelete={confirmDelete} onNew={newChat} />}
      <Text>Đã tải {list.items.length} / {list.total} hội thoại</Text>
      {list.more && <TouchableOpacity disabled={list.loading} onPress={() => void list.loadMore()} testID="conversations-load-more">
        <Text>{list.loading ? 'Đang tải…' : 'Tải thêm hội thoại'}</Text></TouchableOpacity>}
      {list.error && <TouchableOpacity onPress={() => void list.refresh()}><Text>Thử lại</Text></TouchableOpacity>}
    </ScrollView>
  </UCScreenContainer>;
}
