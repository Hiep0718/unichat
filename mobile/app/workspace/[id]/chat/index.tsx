import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { spacing } from '../../../../src/design/tokens';
import { UCScreenContainer } from '../../../../src/components/uc-screen-container';
import { useChatStream } from '../../../../src/features/chat/use-chat-stream';
import { MessageBubble } from '../../../../src/features/chat/components/message-bubble';
import { ThinkingIndicator } from '../../../../src/features/chat/components/thinking-indicator';
import { ChatInputBar } from '../../../../src/features/chat/components/chat-input-bar';
import { ChatHeader } from '../../../../src/features/chat/components/chat-header';
import { ChatEmptyState } from '../../../../src/features/chat/components/chat-empty-state';
import { ChatCitationSheet } from '../../../../src/features/chat/components/chat-citation-sheet';
import { workspaceApi } from '../../../../src/features/workspaces/workspace-api';
import { WorkspaceDetail, DocumentItem } from '../../../../src/features/workspaces/workspace-types';
import { CitationItem } from '../../../../src/types/api';
import { isValidUuid } from '../../../../src/lib/uuid';

export default function NewWorkspaceChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);

  const {
    messages,
    isStreaming,
    isThinking,
    thoughtSteps,
    streamingAnswer,
    currentCitations,
    sendMessage,
  } = useChatStream({
    workspaceId: isValidUuid(id) ? id : '',
  });

  const loadWorkspaceContext = useCallback(async () => {
    if (!isValidUuid(id)) return;
    try {
      const [ws, docsRes] = await Promise.all([
        workspaceApi.getWorkspace(id),
        workspaceApi.getWorkspaceDocuments(id, { page: 0, size: 10 }),
      ]);
      setWorkspace(ws);
      setDocuments(docsRes.content || []);
    } catch {
      // Handled silently
    }
  }, [id]);

  useEffect(() => {
    loadWorkspaceContext();
  }, [loadWorkspaceContext]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, streamingAnswer, thoughtSteps]);

  return (
    <UCScreenContainer gradient={false}>
      <ChatHeader
        workspaceName={workspace?.name || 'Hỏi đáp Tri thức AI'}
        documentCount={workspace?.documentCount || documents.length}
        onBack={() => router.back()}
        onOpenHistory={() => router.push(`/workspace/${id}/conversations` as any)}
        isStreaming={isStreaming}
      />

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <ChatEmptyState
              workspaceName={workspace?.name}
              documents={documents}
              onSelectPrompt={(prompt) => sendMessage(prompt)}
            />
          ) : (
            <View style={styles.messageList}>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onPressCitation={(c) => setSelectedCitation(c)}
                />
              ))}
            </View>
          )}

          {isThinking && <ThinkingIndicator thoughtSteps={thoughtSteps} />}

          {isStreaming && streamingAnswer ? (
            <MessageBubble
              message={{
                id: 'streaming-live',
                conversationId: 'temp',
                sender: 'ASSISTANT',
                content: streamingAnswer,
                citations: currentCitations,
                createdAt: new Date().toISOString(),
              }}
              onPressCitation={(c) => setSelectedCitation(c)}
            />
          ) : null}
        </ScrollView>

        <ChatInputBar onSend={sendMessage} disabled={isStreaming} />
      </KeyboardAvoidingView>

      <ChatCitationSheet
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </UCScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  messageList: {
    gap: spacing.sm,
  },
});
