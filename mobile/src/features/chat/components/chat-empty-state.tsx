import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UCIcon } from '../../../components/uc-icon';
import { dock, radii, workplace } from '../../../design/tokens';
import { shadows } from '../../../design/shadows';
import { WorkspaceCover } from '../../workspaces/components/workspace-cover';

interface ChatEmptyStateProps {
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly topics?: readonly string[];
  /** Số tài liệu trợ lý đọc được trên tổng số; null khi chưa tải xong. */
  readonly readiness: { readonly ready: number; readonly total: number } | null;
  readonly suggestions: readonly string[];
  readonly onSelectPrompt: (prompt: string) => void;
}

function ReadinessPill({ readiness }: { readonly readiness: ChatEmptyStateProps['readiness'] }) {
  if (!readiness) return null;
  const none = readiness.ready === 0;
  return (
    <View style={styles.pill} testID="readiness-pill">
      <View style={[styles.pillDot, none && styles.pillDotOff]} />
      <Text style={styles.pillText}>
        {none ? 'Chưa có tài liệu sẵn sàng' : `${readiness.ready}/${readiness.total} tài liệu sẵn sàng`}
      </Text>
    </View>
  );
}

/**
 * Màn mở đầu của một cuộc trò chuyện mới trong nhóm.
 *
 * Ảnh bìa là ảnh của chính nhóm, để người dùng nhìn là biết đang hỏi kho nào.
 * Gợi ý dựng từ tài liệu đã sẵn sàng; bấm một gợi ý là gửi luôn.
 */
export function ChatEmptyState(props: ChatEmptyStateProps) {
  const { workspaceId, workspaceName, topics, readiness, suggestions, onSelectPrompt } = props;
  return (
    <View style={styles.container}>
      <View style={styles.cover}>
        <WorkspaceCover workspaceId={workspaceId} name={workspaceName} topics={topics} />
        <View style={styles.coverIcon}>
          <UCIcon name="auto-awesome" size={26} color="#FFFFFF" />
        </View>
      </View>

      <Text style={styles.title} accessibilityRole="header">Hỏi kho tri thức {workspaceName}</Text>
      <ReadinessPill readiness={readiness} />
      <Text style={styles.subtitle}>
        Câu trả lời luôn kèm trích dẫn. Thiếu căn cứ trong tài liệu thì trợ lý sẽ hỏi lại thay vì đoán.
      </Text>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <Text style={styles.section}>GỢI Ý</Text>
          {suggestions.map((prompt, index) => (
            <Pressable
              key={prompt}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
              onPress={() => onSelectPrompt(prompt)}
              accessibilityRole="button"
              testID={`starter-prompt-${index}`}
            >
              <UCIcon name="auto-awesome" size={18} color={dock.accent} />
              <Text style={styles.suggestionText}>{prompt}</Text>
              <UCIcon name="north-east" size={16} color={workplace.inkMuted} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 8 },
  cover: { width: 240, height: 146, borderRadius: 20, overflow: 'hidden', marginBottom: 18, ...shadows.card },
  coverIcon: {
    position: 'absolute',
    alignSelf: 'center',
    top: 49,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  title: { color: workplace.ink, fontSize: 24, lineHeight: 31, fontFamily: 'Inter_800ExtraBold', textAlign: 'center', letterSpacing: -0.4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: workplace.card,
    borderWidth: 1,
    borderColor: workplace.line,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
  pillDotOff: { backgroundColor: workplace.inkMuted },
  pillText: { color: workplace.inkSoft, fontSize: 13, fontFamily: 'Inter_500Medium' },
  subtitle: { color: workplace.inkMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, paddingHorizontal: 8 },
  suggestions: { alignSelf: 'stretch', gap: 10, marginTop: 22 },
  section: { color: workplace.inkMuted, fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.4 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radii.xl,
    backgroundColor: workplace.card,
    borderWidth: 1,
    borderColor: workplace.line,
  },
  pressed: { backgroundColor: workplace.canvas },
  suggestionText: { flex: 1, color: workplace.ink, fontSize: 14.5, lineHeight: 20, fontFamily: 'Inter_600SemiBold' },
});
