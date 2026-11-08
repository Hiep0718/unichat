import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { workplace } from '../../../../src/design/tokens';
import { AssistantChatView } from '../../../../src/features/chat/components/assistant-chat-view';
import { isValidUuid } from '../../../../src/lib/uuid';

/** Một cuộc trò chuyện đã có với trợ lý của nhóm. */
export default function WorkspaceChatRoomScreen() {
  const { id, conversationId } = useLocalSearchParams<{ id: string; conversationId: string }>();
  if (!isValidUuid(id) || !isValidUuid(conversationId)) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Cuộc trò chuyện không tồn tại.</Text>
      </View>
    );
  }
  return <AssistantChatView workspaceId={id} conversationId={conversationId} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: workplace.canvas },
  text: { color: workplace.inkMuted, fontSize: 14 },
});
