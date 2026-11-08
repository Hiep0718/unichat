import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UCIcon } from '../../../components/uc-icon';
import { radii, workplace } from '../../../design/tokens';
import { MAX_REPLY_LENGTH } from '../feed-api';

interface CommentComposerProps {
  /** Đang trả lời ai; null là bình luận thẳng vào bài. */
  readonly replyingTo: string | null;
  readonly onCancelReply: () => void;
  /** Ném lỗi khi gửi hỏng; khi đó nội dung được giữ lại để gửi lại. */
  readonly onSubmit: (body: string) => Promise<void>;
}

/** Ô viết bình luận cố định ở đáy màn chi tiết. */
export function CommentComposer({ replyingTo, onCancelReply, onSubmit }: CommentComposerProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const canSend = text.trim().length > 0 && !sending;

  const submit = async () => {
    if (!canSend) return;
    const body = text.trim();
    setSending(true);
    try {
      await onSubmit(body);
      setText('');
    } catch {
      // Màn cha đã báo lỗi; giữ chữ lại để người dùng khỏi gõ lại.
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
      {replyingTo && (
        <View style={styles.replying}>
          <Text style={styles.replyingText} numberOfLines={1}>
            Đang trả lời <Text style={styles.replyingName}>{replyingTo}</Text>
          </Text>
          <Pressable onPress={onCancelReply} hitSlop={8} accessibilityRole="button" accessibilityLabel="Huỷ trả lời">
            <UCIcon name="close" size={16} color={workplace.inkMuted} />
          </Pressable>
        </View>
      )}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={replyingTo ? 'Viết câu trả lời...' : 'Viết bình luận... (gõ @AI để hỏi trợ lý)'}
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={MAX_REPLY_LENGTH}
          testID="comment-input"
        />
        <Pressable
          style={[styles.send, canSend && styles.sendActive]}
          onPress={() => void submit()}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Gửi bình luận"
          accessibilityState={{ disabled: !canSend }}
          testID="comment-send"
        >
          {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <UCIcon name="send" size={19} color="#FFFFFF" />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: workplace.card,
    borderTopWidth: 1,
    borderTopColor: workplace.line,
  },
  replying: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  replyingText: { flex: 1, color: workplace.inkMuted, fontSize: 12.5 },
  replyingName: { color: workplace.ink, fontFamily: 'Inter_600SemiBold' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: radii.xl,
    backgroundColor: workplace.chip,
    color: workplace.ink,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: workplace.inkMuted,
    opacity: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendActive: { backgroundColor: workplace.accent, opacity: 1 },
});
