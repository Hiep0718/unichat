import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { workplace } from '../../../design/tokens';
import { countReady } from '../../documents/document-status';
import { buildSuggestions, splitGroups } from '../assistant-home';
import { newChatPath } from '../assistant-routes';
import { ASSISTANT_KEY, useAssistantHistory, useAssistantWorkspaces, useGroupDocuments } from '../use-assistant-data';
import { useChatStream } from '../use-chat-stream';
import { ChatCitationSheet } from './chat-citation-sheet';
import { ChatEmptyState } from './chat-empty-state';
import { ChatHeader } from './chat-header';
import { ChatInputBar } from './chat-input-bar';
import { GroupPickerSheet } from './group-picker-sheet';
import { MessageBubble } from './message-bubble';
import { SourcesSheet } from './sources-sheet';
import { ThinkingIndicator } from './thinking-indicator';

import type { CitationItem, MessageItem } from '../../../types/api';

interface AssistantChatViewProps {
  readonly workspaceId: string;
  /** Có thì mở cuộc trò chuyện đã có; không thì là cuộc mới. */
  readonly conversationId?: string;
  /** Câu hỏi gõ ở màn Trợ lý AI, gửi ngay một lần khi mở cuộc mới. */
  readonly initialQuestion?: string;
}

/** Tiêu đề trên dải đầu: câu hỏi đầu tiên, hoặc nhãn mặc định khi chưa hỏi gì. */
export function chatTitle(messages: readonly MessageItem[], existing: boolean): string {
  const first = messages.find((message) => message.sender === 'USER')?.content.trim();
  if (first) return first;
  return existing ? 'Cuộc trò chuyện' : 'Cuộc trò chuyện mới';
}

/** Màn chat với trợ lý trong một nhóm. */
export function AssistantChatView({ workspaceId, conversationId, initialQuestion }: AssistantChatViewProps) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const sentInitial = useRef(false);
  const [citation, setCitation] = useState<CitationItem | null>(null);
  const [sheet, setSheet] = useState<'sources' | 'groups' | null>(null);

  const refreshHistory = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [...ASSISTANT_KEY, 'history'] });
  }, [queryClient]);
  const chat = useChatStream({ workspaceId, conversationId, onConversationCreated: refreshHistory });

  const workspaces = useAssistantWorkspaces();
  const history = useAssistantHistory(sheet === 'groups' ? workspaces.data : undefined);
  const documents = useGroupDocuments(workspaceId);
  const workspace = workspaces.data?.find((item) => item.id === workspaceId);
  const name = workspace?.name ?? 'Nhóm';
  const readiness = documents.data ? countReady(documents.data) : null;
  const suggestions = useMemo(() => buildSuggestions(documents.data ?? []), [documents.data]);
  const groups = useMemo(
    () => splitGroups(workspaces.data ?? [], history.data?.entries ?? []),
    [workspaces.data, history.data],
  );

  const { sendMessage } = chat;
  useEffect(() => {
    if (conversationId || !initialQuestion || sentInitial.current) return;
    sentInitial.current = true;
    void sendMessage(initialQuestion);
  }, [conversationId, initialQuestion, sendMessage]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [chat.messages, chat.streamingAnswer, chat.thoughtSteps]);

  const startNew = () => router.replace(newChatPath(workspaceId) as never);
  const empty = chat.messages.length === 0 && !chat.isStreaming;

  return (
    <View style={styles.screen}>
      <ChatHeader
        workspaceName={name}
        title={chatTitle(chat.messages, Boolean(conversationId))}
        isStreaming={chat.isStreaming}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/chat' as never))}
        onPickGroup={() => setSheet('groups')}
        onOpenHistory={() => router.push(`/workspace/${workspaceId}/conversations` as never)}
        onNewChat={startNew}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {chat.loadingHistory ? (
          <ActivityIndicator style={styles.flex} color={workplace.accent} />
        ) : (
          <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {empty ? (
              <ChatEmptyState
                workspaceId={workspaceId}
                workspaceName={name}
                topics={workspace?.topics}
                readiness={readiness}
                suggestions={readiness?.ready === 0 ? [] : suggestions}
                onSelectPrompt={(prompt) => void sendMessage(prompt)}
              />
            ) : (
              chat.messages.map((message) => (
                <MessageBubble key={message.id} message={message} workspaceId={workspaceId} onPressCitation={setCitation} />
              ))
            )}
            {chat.isThinking && <ThinkingIndicator thoughtSteps={chat.thoughtSteps} />}
            {chat.isStreaming && chat.streamingAnswer ? (
              <MessageBubble
                message={{ id: 'streaming-live', conversationId: conversationId ?? 'temp', sender: 'ASSISTANT', content: chat.streamingAnswer, createdAt: new Date().toISOString() }}
                onPressCitation={setCitation}
              />
            ) : null}
            {chat.error && !chat.isStreaming ? <Text style={styles.error} accessibilityRole="alert">{chat.error}</Text> : null}
          </ScrollView>
        )}
        <ChatInputBar
          onSend={(text, expanded) => void sendMessage(text, expanded)}
          disabled={chat.isStreaming || readiness?.ready === 0}
          placeholder={readiness?.ready === 0 ? 'Nhóm chưa có tài liệu sẵn sàng' : `Hỏi kho ${name}...`}
          sourceCount={readiness?.ready}
          onOpenSources={() => setSheet('sources')}
        />
      </KeyboardAvoidingView>

      <ChatCitationSheet citation={citation} onClose={() => setCitation(null)} />
      <SourcesSheet
        visible={sheet === 'sources'}
        workspaceName={name}
        documents={documents.data}
        loading={documents.isLoading}
        onClose={() => setSheet(null)}
      />
      <GroupPickerSheet
        visible={sheet === 'groups'}
        recent={groups.recent}
        others={groups.others}
        selectedId={workspaceId}
        selectedReadiness={readiness ? `${readiness.ready}/${readiness.total} tài liệu sẵn sàng` : undefined}
        onPick={(picked) => {
          setSheet(null);
          if (picked.id !== workspaceId) router.replace(newChatPath(picked.id) as never);
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: workplace.canvas },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  error: { color: workplace.alert, fontSize: 13.5, textAlign: 'center', marginTop: 12 },
});
