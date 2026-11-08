import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { UCIcon } from '../../src/components/uc-icon';
import { UCTabHero, heroButtonStyle } from '../../src/components/uc-tab-hero';
import { dock, messenger } from '../../src/design/tokens';
import { ContactPickerSheet } from '../../src/features/messages/components/contact-picker-sheet';
import { ConversationRow } from '../../src/features/messages/components/conversation-row';
import { filterConversations } from '../../src/features/messages/conversation-presenter';
import { messagesApi } from '../../src/features/messages/messages-api';
import { useConversations, useInvalidateConversations } from '../../src/features/messages/use-conversations';
import { useToast } from '../../src/lib/toast-context';

import type { Contact, Conversation } from '../../src/features/messages/messages-api';

function openThread(conversationId: string): void {
  router.push(`/messages/${conversationId}` as never);
}

/** Danh sách tin nhắn riêng và nhóm chat, kèm tìm kiếm và nút nhắn người mới. */
export default function MessagesScreen() {
  const { showToast } = useToast();
  const conversations = useConversations();
  const invalidate = useInvalidateConversations();
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const shown = useMemo(
    () => filterConversations(conversations.data ?? [], query),
    [conversations.data, query],
  );

  const handleOpen = useCallback((conversation: Conversation) => openThread(conversation.id), []);

  const handlePick = useCallback(async (contact: Contact) => {
    setPendingUserId(contact.userId);
    try {
      const conversation = await messagesApi.openConversation(contact.userId);
      invalidate();
      setPickerOpen(false);
      openThread(conversation.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không mở được cuộc trò chuyện';
      showToast({ message, type: 'error' });
    } finally {
      setPendingUserId(null);
    }
  }, [invalidate, showToast]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={conversations.isRefetching} onRefresh={() => void conversations.refetch()} />
        }
      >
        <UCTabHero
          title="Tin nhắn"
          subtitle="Trò chuyện riêng và nhóm chat với người cùng nhóm."
          action={
            <Pressable
              style={({ pressed }) => [heroButtonStyle, pressed && styles.pressed]}
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Nhắn tin cho người cùng nhóm"
              testID="new-message-button"
            >
              <UCIcon name="person-add-alt" size={21} color="#FFFFFF" />
            </Pressable>
          }
        >
          <View style={styles.search}>
            <UCIcon name="search" size={20} color={messenger.chipInk} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm người hoặc nhóm..."
              placeholderTextColor="#94A3B8"
              testID="conversation-search-input"
            />
          </View>
        </UCTabHero>
        <View style={styles.body}>
          <ConversationsBody
            loading={conversations.isLoading}
            failed={conversations.isError}
            searching={query.trim().length > 0}
            items={shown}
            onOpen={handleOpen}
            onRetry={() => void conversations.refetch()}
          />
        </View>
      </ScrollView>

      <ContactPickerSheet
        visible={pickerOpen}
        pendingUserId={pendingUserId}
        onPick={handlePick}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

interface ConversationsBodyProps {
  readonly loading: boolean;
  readonly failed: boolean;
  readonly searching: boolean;
  readonly items: readonly Conversation[];
  readonly onOpen: (conversation: Conversation) => void;
  readonly onRetry: () => void;
}

function ConversationsBody({ loading, failed, searching, items, onOpen, onRetry }: ConversationsBodyProps) {
  if (loading) return <ActivityIndicator style={styles.state} color={dock.accent} />;
  if (failed) {
    return (
      <Pressable style={styles.state} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.stateText}>Không tải được tin nhắn. Chạm để thử lại.</Text>
      </Pressable>
    );
  }
  if (items.length === 0) {
    return (
      <View style={styles.state} testID="messages-empty">
        <UCIcon name="chat-bubble-outline" size={32} color={messenger.disabled} />
        <Text style={styles.stateText}>
          {searching ? 'Không tìm thấy cuộc trò chuyện phù hợp.' : 'Chưa có cuộc trò chuyện nào. Nhắn cho người cùng nhóm để bắt đầu.'}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      {items.map((conversation) => (
        <ConversationRow key={conversation.id} conversation={conversation} onOpen={onOpen} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: messenger.canvas },
  pressed: { opacity: 0.75 },
  // Ô tìm kiếm nằm trong dải tối như ô hỏi của Trợ lý AI: thẻ trắng nổi trên nền tối.
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 18,
    backgroundColor: messenger.card,
  },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Inter_400Regular', color: messenger.theirsInk },
  content: { paddingBottom: 120 },
  body: { paddingHorizontal: 12, paddingTop: 16 },
  card: {
    backgroundColor: messenger.card,
    borderRadius: 20,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: messenger.line,
  },
  state: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 24 },
  stateText: { textAlign: 'center', fontSize: 14, fontFamily: 'Inter_400Regular', color: messenger.chipInk },
});
