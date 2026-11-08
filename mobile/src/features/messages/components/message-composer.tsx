import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UCIcon } from '../../../components/uc-icon';
import { dock, messenger } from '../../../design/tokens';
import { MAX_MESSAGE_LENGTH } from '../messages-api';

interface MessageComposerProps {
  readonly sending: boolean;
  /** Ném lỗi khi gửi hỏng; khi đó nội dung được giữ lại để gửi lại. */
  readonly onSend: (body: string) => Promise<void>;
}

/** Ô nhập tin ở đáy luồng chat, với nút gửi chỉ sáng khi có chữ. */
export function MessageComposer({ sending, onSend }: MessageComposerProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    const body = text.trim();
    setText('');
    try {
      await onSend(body);
    } catch {
      // Màn cha đã báo lỗi; ở đây chỉ trả lại chữ để người dùng khỏi gõ lại.
      setText(body);
    }
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Nhập tin nhắn..."
        placeholderTextColor="#94A3B8"
        multiline
        maxLength={MAX_MESSAGE_LENGTH}
        testID="message-input"
      />
      <Pressable
        style={[styles.send, canSend && styles.sendActive]}
        onPress={() => void handleSend()}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Gửi tin nhắn"
        accessibilityState={{ disabled: !canSend }}
        testID="send-message-button"
      >
        {sending
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <UCIcon name="send" size={20} color="#FFFFFF" />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: messenger.card,
    borderTopWidth: 1,
    borderTopColor: messenger.line,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 16,
    backgroundColor: messenger.field,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: messenger.theirsInk,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: messenger.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendActive: { backgroundColor: dock.accent },
});
