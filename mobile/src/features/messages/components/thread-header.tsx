import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UCIcon } from '../../../components/uc-icon';
import { messenger } from '../../../design/tokens';
import { MemberAvatar } from '../../account/components/member-avatar';
import { ConversationAvatar } from './conversation-avatar';

import type { Conversation } from '../messages-api';

interface ThreadHeaderProps {
  /** Null khi danh sách chưa tải xong; tiêu đề tạm hiện thay. */
  readonly conversation: Conversation | null;
  readonly onBack: () => void;
  readonly onCall: () => void;
}

function subtitleOf(conversation: Conversation | null): string {
  if (!conversation) return '';
  if (conversation.kind === 'DIRECT') return 'Tin nhắn riêng';
  return `${conversation.participants.length} thành viên`;
}

/** Dải đầu của luồng chat: quay lại, avatar, tên, và nút gọi cho tin riêng. */
export function ThreadHeader({ conversation, onBack, onCall }: ThreadHeaderProps) {
  const insets = useSafeAreaInsets();
  const title = conversation?.title ?? 'Tin nhắn';

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Quay lại">
        <UCIcon name="chevron-left" size={28} color={messenger.theirsInk} />
      </Pressable>
      {conversation
        ? <ConversationAvatar conversation={conversation} size={40} />
        : <MemberAvatar name={title} size={40} />}
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitleOf(conversation)}</Text>
      </View>
      {conversation?.kind === 'DIRECT' && (
        <Pressable
          onPress={onCall}
          style={({ pressed }) => [styles.call, pressed && styles.callPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Gọi ${title}`}
          testID="thread-call-button"
        >
          <UCIcon name="call" size={20} color={messenger.theirsInk} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: messenger.card,
    borderBottomWidth: 1,
    borderBottomColor: messenger.line,
  },
  back: { paddingRight: 2 },
  titles: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontFamily: 'Inter_700Bold', color: messenger.theirsInk },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', color: messenger.chipInk },
  call: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: messenger.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callPressed: { backgroundColor: messenger.line },
});
