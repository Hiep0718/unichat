import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, spacing } from '../../../../src/design/tokens';
import { typography } from '../../../../src/design/typography';
import { UCScreenContainer } from '../../../../src/components/uc-screen-container';
import { useToast } from '../../../../src/lib/toast-context';
import { chatApi } from '../../../../src/features/chat/chat-api';
import { workspaceApi } from '../../../../src/features/workspaces/workspace-api';
import { WorkspaceDetail, DocumentItem } from '../../../../src/features/workspaces/workspace-types';
import { useChatStream } from '../../../../src/features/chat/use-chat-stream';
import { MessageBubble } from '../../../../src/features/chat/components/message-bubble';
import { ThinkingIndicator } from '../../../../src/features/chat/components/thinking-indicator';
import { ChatInputBar } from '../../../../src/features/chat/components/chat-input-bar';
import { ChatHeader } from '../../../../src/features/chat/components/chat-header';
import { ChatEmptyState } from '../../../../src/features/chat/components/chat-empty-state';
import { ChatCitationSheet } from '../../../../src/features/chat/components/chat-citation-sheet';
import { CitationItem } from '../../../../src/types/api';
import { isValidUuid } from '../../../../src/lib/uuid';

export default function WorkspaceChatRoomScreen() {
  const { id, conversationId } = useLocalSearchParams<{
    id: string;
    conversationId: string;
  }>();
  const { showToast } = useToast();
  const scrollViewRef = useRef<ScrollView>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);

  const {
    messages,
    setMessages,
    isStreaming,
    isThinking,
    thoughtSteps,
    streamingAnswer,
    currentCitations,
    sendMessage,
  } = useChatStream({
    workspaceId: isValidUuid(id) ? id : '',
    conversationId: isValidUuid(conversationId) ? conversationId : undefined,
  });

  const loadInitialData = useCallback(async () => {
    if (!isValidUuid(id) || !isValidUuid(conversationId)) {
      setLoadingHistory(false);
      return;
    }

    try {
      const [ws, conv, docsRes] = await Promise.all([
        workspaceApi.getWorkspace(id).catch(() => null),
        chatApi.getConversation(id, conversationId),
        workspaceApi.getWorkspaceDocuments(id, { page: 0, size: 10 }).catch(() => ({ content: [] })),
      ]);

      if (ws) setWorkspace(ws);
      if (conv?.messages) {
        setMessages(conv.messages);
      }
      if (docsRes?.content) {
        setDocuments(docsRes.content);
      }
    } catch (err: any) {
      showToast({
        message: err.message || 'Không thể tải lịch sử trò chuyện',
        type: 'error',
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [id, conversationId, setMessages, showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, streamingAnswer, thoughtSteps]);

  return (
    <UCScreenContainer gradient={false}>
      <ChatHeader
        workspaceName={workspace?.name || 'Hội thoại AI'}
        documentCount={workspace?.documentCount || 0}
        onBack={() => router.back()}
        onOpenHistory={() => router.push(`/workspace/${id}/conversations` as any)}
        isStreaming={isStreaming}
      />

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loadingHistory ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải lịch sử hội thoại...</Text>
          </View>
        ) : (
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
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onPressCitation={(c) => setSelectedCitation(c)}
                />
              ))
            )}

            {isThinking && <ThinkingIndicator thoughtSteps={thoughtSteps} />}

            {isStreaming && streamingAnswer ? (
              <MessageBubble
                message={{
                  id: 'streaming-live',
                  conversationId: conversationId || 'temp',
                  sender: 'ASSISTANT',
                  content: streamingAnswer,
                  citations: currentCitations,
                  createdAt: new Date().toISOString(),
                }}
                onPressCitation={(c) => setSelectedCitation(c)}
              />
            ) : null}
          </ScrollView>
        )}

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
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.outline,
  },
  emptySessionBox: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  emptyTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.outline,
    textAlign: 'center',
  },
});
