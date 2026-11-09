import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { workplace } from '../../../../src/design/tokens';
import { AssistantChatView } from '../../../../src/features/chat/components/assistant-chat-view';
import { isValidUuid } from '../../../../src/lib/uuid';

/** Cuộc trò chuyện mới với trợ lý trong một nhóm; `q` là câu hỏi gửi ngay nếu có. */
export default function NewWorkspaceChatScreen() {
  const { id, q } = useLocalSearchParams<{ id: string; q?: string }>();
  if (!isValidUuid(id)) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Nhóm không tồn tại.</Text>
      </View>
    );
  }
  return <AssistantChatView workspaceId={id} initialQuestion={typeof q === 'string' ? q : undefined} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: workplace.canvas },
  text: { color: workplace.inkMuted, fontSize: 14 },
});
