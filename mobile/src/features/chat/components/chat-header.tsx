import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UCIcon } from '../../../components/uc-icon';
import { radii, workplace } from '../../../design/tokens';

interface ChatHeaderProps {
  readonly workspaceName: string;
  /** Tiêu đề cuộc trò chuyện, hoặc "Cuộc trò chuyện mới". */
  readonly title: string;
  readonly isStreaming?: boolean;
  readonly onBack: () => void;
  /** Bỏ trống thì tên nhóm không bấm được. */
  readonly onPickGroup?: () => void;
  readonly onOpenHistory?: () => void;
  readonly onNewChat?: () => void;
}

/**
 * Dải đầu màn chat: nhóm đang hỏi (bấm để đổi), tiêu đề, lịch sử và tạo mới.
 *
 * Chấm màu trước tên nhóm chuyển sang hổ phách khi trợ lý đang trả lời, để
 * trạng thái hiện mà không chiếm thêm một dòng.
 */
export function ChatHeader(props: ChatHeaderProps) {
  const { workspaceName, title, isStreaming = false, onBack, onPickGroup, onOpenHistory, onNewChat } = props;
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Quay lại" testID="chat-header-back">
        <UCIcon name="chevron-left" size={28} color={workplace.ink} />
      </Pressable>

      <View style={styles.titles}>
        <Pressable
          style={styles.group}
          onPress={onPickGroup}
          disabled={!onPickGroup || isStreaming}
          accessibilityRole="button"
          accessibilityLabel={`Đang hỏi trong ${workspaceName}. Đổi nhóm`}
          testID="chat-header-group"
        >
          <View style={[styles.dot, isStreaming && styles.dotBusy]} />
          <Text style={styles.groupName} numberOfLines={1}>{workspaceName}</Text>
          {onPickGroup && <UCIcon name="keyboard-arrow-down" size={16} color="#15803D" />}
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{isStreaming ? 'Trợ lý đang trả lời...' : title}</Text>
      </View>

      {onOpenHistory && (
        <Pressable onPress={onOpenHistory} hitSlop={6} style={styles.ghost} accessibilityRole="button" accessibilityLabel="Lịch sử trò chuyện" testID="chat-header-history">
          <UCIcon name="history" size={22} color={workplace.ink} />
        </Pressable>
      )}
      {onNewChat && (
        <Pressable
          onPress={onNewChat}
          disabled={isStreaming}
          style={({ pressed }) => [styles.newChat, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Cuộc trò chuyện mới"
          testID="chat-header-new"
        >
          <UCIcon name="add" size={22} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: workplace.card,
    borderBottomWidth: 1,
    borderBottomColor: workplace.line,
  },
  back: { paddingRight: 2 },
  titles: { flex: 1, minWidth: 0 },
  group: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', maxWidth: '100%' },
  dot: { width: 9, height: 9, borderRadius: 3, backgroundColor: '#16A34A' },
  dotBusy: { backgroundColor: '#F59E0B' },
  groupName: { flexShrink: 1, color: '#15803D', fontSize: 13, fontFamily: 'Inter_700Bold' },
  title: { color: workplace.ink, fontSize: 17, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.2 },
  ghost: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  newChat: { width: 44, height: 44, borderRadius: radii.lg, backgroundColor: workplace.ink, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
