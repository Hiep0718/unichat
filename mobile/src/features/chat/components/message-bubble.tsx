import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';

import { UCIcon } from '../../../components/uc-icon';
import { dock, radii, workplace } from '../../../design/tokens';
import { WorkspaceSummaryDocuments } from './workspace-summary-documents';

import type { CitationItem, MessageItem } from '../../../types/api';

interface MessageBubbleProps {
  message: MessageItem;
  workspaceId?: string;
  onPressCitation?: (citation: CitationItem) => void;
}

/** Số tài liệu khác nhau mà câu trả lời trích dẫn. */
export function distinctDocuments(citations: readonly CitationItem[]): number {
  return new Set(citations.map((citation) => citation.documentId || citation.fileName)).size;
}

function MessageWarning({ message }: { readonly message: MessageItem }) {
  if (!message.warningMessage || message.redacted) return null;
  return <Text style={styles.warning} accessibilityRole="text">{message.warningMessage}</Text>;
}

function AssistantMeta({ message, citations }: { readonly message: MessageItem; readonly citations: readonly CitationItem[] }) {
  const docs = distinctDocuments(citations);
  const parts = [docs > 0 ? `dựa trên ${docs} tài liệu` : null, message.knowledgeMode === 'EXPANDED' ? 'có kiến thức ngoài' : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.meta}>
      <View style={styles.avatar}>
        <UCIcon name="auto-awesome" size={13} color="#FFFFFF" />
      </View>
      <Text style={styles.name}>Trợ lý AI</Text>
      {parts ? <Text style={styles.metaText} numberOfLines={1}>· {parts}</Text> : null}
    </View>
  );
}

interface CitationStripProps {
  readonly citations: readonly CitationItem[];
  readonly onPress?: (citation: CitationItem) => void;
}

/** Nguồn đánh số theo thứ tự trích dẫn, cuộn ngang; bấm để đọc đoạn gốc. */
function CitationStrip({ citations, onPress }: CitationStripProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {citations.map((citation, index) => (
        <Pressable
          key={citation.citationId || `${citation.documentId}-${index}`}
          style={({ pressed }) => [styles.source, pressed && styles.pressed]}
          onPress={() => onPress?.(citation)}
          accessibilityRole="button"
          accessibilityLabel={`Nguồn ${index + 1}: ${citation.fileName || 'Tài liệu'}`}
          testID={`citation-card-${index}`}
        >
          <View style={styles.sourceIndex}>
            <Text style={styles.sourceIndexText}>{index + 1}</Text>
          </View>
          <Text style={styles.sourceName} numberOfLines={1}>{citation.fileName || 'Tài liệu'}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/**
 * Một lượt trong cuộc trò chuyện: câu hỏi của người dùng (nền tối, bên phải)
 * hoặc câu trả lời của trợ lý (thẻ trắng kèm nguồn đánh số).
 */
export function MessageBubble({ message, workspaceId, onPressCitation }: MessageBubbleProps) {
  if (message.sender === 'USER') {
    return (
      <View style={styles.userWrap} testID={`user-message-${message.id}`}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  const citations = message.citations ?? [];
  return (
    <View style={styles.aiWrap} testID={`ai-message-${message.id}`}>
      <AssistantMeta message={message} citations={citations} />
      <View style={styles.aiCard}>
        <Markdown style={markdownStyles}>{message.content}</Markdown>
        <MessageWarning message={message} />
      </View>
      {workspaceId && message.workspaceSummaryId && !message.redacted && (
        <WorkspaceSummaryDocuments workspaceId={workspaceId} summaryId={message.workspaceSummaryId} />
      )}
      {citations.length > 0 && <CitationStrip citations={citations} onPress={onPressCitation} />}
    </View>
  );
}

const styles = StyleSheet.create({
  userWrap: { alignItems: 'flex-end', marginVertical: 8, paddingLeft: 40 },
  userBubble: { maxWidth: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderBottomRightRadius: 6, backgroundColor: workplace.ink },
  userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22, fontFamily: 'Inter_500Medium' },
  aiWrap: { gap: 10, marginVertical: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  avatar: { width: 24, height: 24, borderRadius: 7, backgroundColor: workplace.ink, alignItems: 'center', justifyContent: 'center' },
  name: { color: workplace.ink, fontSize: 13.5, fontFamily: 'Inter_700Bold' },
  metaText: { flexShrink: 1, color: workplace.inkMuted, fontSize: 12.5 },
  aiCard: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radii.xl, backgroundColor: workplace.card, borderWidth: 1, borderColor: workplace.line },
  warning: { marginTop: 8, color: workplace.warnInk, fontSize: 13, lineHeight: 19 },
  strip: { gap: 8, paddingRight: 8 },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 240,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 9,
    borderRadius: radii.lg,
    backgroundColor: workplace.card,
    borderWidth: 1,
    borderColor: workplace.line,
  },
  pressed: { backgroundColor: workplace.canvas },
  sourceIndex: { minWidth: 22, height: 22, borderRadius: 6, backgroundColor: dock.accent, alignItems: 'center', justifyContent: 'center' },
  sourceIndexText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter_700Bold' },
  sourceName: { flexShrink: 1, color: workplace.ink, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});

const markdownStyles = {
  body: { color: workplace.ink, fontSize: 15, lineHeight: 24 },
  strong: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const, color: workplace.ink },
  code_inline: { backgroundColor: workplace.chip, color: workplace.ink, paddingHorizontal: 6, borderRadius: 4, fontFamily: 'monospace', fontSize: 13 },
  code_block: { backgroundColor: workplace.ink, color: '#F8FAFC', padding: 12, borderRadius: 10, marginVertical: 8, fontFamily: 'monospace', fontSize: 12.5 },
  fence: { backgroundColor: workplace.ink, color: '#F8FAFC', padding: 12, borderRadius: 10, marginVertical: 8, fontFamily: 'monospace', fontSize: 12.5 },
  bullet_list: { marginVertical: 4 },
  bullet_list_item: { marginVertical: 2 },
};
