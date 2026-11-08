import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dock, messenger } from '../../../design/tokens';
import { formatListTime, previewOf } from '../conversation-presenter';
import { ConversationAvatar } from './conversation-avatar';

import type { Conversation } from '../messages-api';

interface ConversationRowProps {
  readonly conversation: Conversation;
  readonly onOpen: (conversation: Conversation) => void;
}

/** Một dòng trong danh sách tin nhắn: avatar, tên, xem trước, thời gian. */
export const ConversationRow = React.memo(function ConversationRow({
  conversation,
  onOpen,
}: ConversationRowProps) {
  const unread = conversation.unreadCount > 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => onOpen(conversation)}
      accessibilityRole="button"
      accessibilityLabel={`Mở cuộc trò chuyện với ${conversation.title}`}
      testID={`conversation-row-${conversation.id}`}
    >
      <ConversationAvatar conversation={conversation} size={48} />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={styles.title} numberOfLines={1}>{conversation.title}</Text>
          {conversation.lastMessageAt && (
            <Text style={[styles.time, unread && styles.timeUnread]}>
              {formatListTime(conversation.lastMessageAt)}
            </Text>
          )}
        </View>
        <View style={styles.bottomLine}>
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
            {previewOf(conversation)}
          </Text>
          {unread && (
            <View style={styles.unread}>
              <Text style={styles.unreadText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressed: { backgroundColor: messenger.canvas },
  body: { flex: 1, minWidth: 0, gap: 3 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontFamily: 'Inter_700Bold', color: messenger.theirsInk },
  time: { fontSize: 12, fontFamily: 'Inter_400Regular', color: messenger.chipInk },
  timeUnread: { color: dock.accent, fontFamily: 'Inter_600SemiBold' },
  preview: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: messenger.chipInk },
  previewUnread: { color: messenger.theirsInk, fontFamily: 'Inter_600SemiBold' },
  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: dock.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_700Bold' },
});
