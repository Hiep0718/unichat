import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { dock, messenger } from '../../src/design/tokens';
import { MessageComposer } from '../../src/features/messages/components/message-composer';
import { ThreadHeader } from '../../src/features/messages/components/thread-header';
import { CallLogPill, DayChip, MessageRow } from '../../src/features/messages/components/thread-items';
import { buildTimeline } from '../../src/features/messages/thread-timeline';
import { useConversations } from '../../src/features/messages/use-conversations';
import { useThread } from '../../src/features/messages/use-thread';
import { useToast } from '../../src/lib/toast-context';
import { isValidUuid } from '../../src/lib/uuid';

import type { TimelineItem } from '../../src/features/messages/thread-timeline';

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/messages' as never);
}

/** Luồng chat của một cuộc trò chuyện, đọc id từ đường dẫn. */
export default function ThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  if (!isValidUuid(conversationId)) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateText}>Cuộc trò chuyện không tồn tại.</Text>
        <Pressable onPress={goBack} accessibilityRole="button">
          <Text style={styles.link}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }
  return <Thread conversationId={conversationId} />;
}

function Thread({ conversationId }: { readonly conversationId: string }) {
  const { showToast } = useToast();
  const thread = useThread(conversationId);
  const { data: conversations } = useConversations();
  const conversation = conversations?.find((item) => item.id === conversationId) ?? null;
  const isGroup = conversation?.kind === 'GROUP';

  // FlatList đảo ngược giữ tin mới nhất ở đáy và cuộn tải thêm lên trên.
  const items = useMemo(
    () => buildTimeline(thread.messages, thread.calls).reverse(),
    [thread.messages, thread.calls],
  );

  const handleSend = useCallback(async (body: string) => {
    try {
      await thread.send(body);
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Không gửi được tin nhắn', type: 'error' });
      throw error;
    }
  }, [thread, showToast]);

  const handleLoadOlder = useCallback(() => {
    thread.loadOlder().catch(() => showToast({ message: 'Không tải được tin cũ hơn', type: 'error' }));
  }, [thread, showToast]);

  const handleCall = useCallback(() => {
    showToast({ message: 'Gọi thoại hiện chỉ hỗ trợ trên bản web.', type: 'info' });
  }, [showToast]);

  const renderItem = useCallback(({ item }: { item: TimelineItem }) => {
    if (item.kind === 'day') return <DayChip label={item.label} />;
    if (item.kind === 'calls') return <CallLogPill entries={item.entries} />;
    return <MessageRow item={item} showSender={isGroup && item.showAvatar} />;
  }, [isGroup]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThreadHeader conversation={conversation} onBack={goBack} onCall={handleCall} />
      {thread.status === 'loading' && <ActivityIndicator style={styles.center} color={dock.accent} />}
      {thread.status === 'error' && (
        <Pressable style={styles.center} onPress={() => void thread.reload()} accessibilityRole="button">
          <Text style={styles.stateText}>Không tải được tin nhắn. Chạm để thử lại.</Text>
        </Pressable>
      )}
      {thread.status === 'ready' && (
        <FlatList
          inverted
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadOlder}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={[styles.stateText, styles.empty]}>Hãy gửi lời chào đầu tiên.</Text>}
          ListFooterComponent={thread.loadingOlder ? <ActivityIndicator color={dock.accent} /> : undefined}
          testID="thread-list"
        />
      )}
      <MessageComposer sending={thread.sending} onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: messenger.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  list: { paddingHorizontal: 14, paddingVertical: 12, flexGrow: 1 },
  // Danh sách đảo ngược lật cả phần trống, nên lật lại cho chữ đứng thẳng.
  empty: { transform: [{ scaleY: -1 }], marginTop: 24 },
  stateText: { textAlign: 'center', fontSize: 14, fontFamily: 'Inter_400Regular', color: messenger.chipInk },
  link: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: dock.accent },
});
