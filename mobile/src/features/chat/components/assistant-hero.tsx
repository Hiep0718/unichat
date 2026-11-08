import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { UCIcon } from '../../../components/uc-icon';
import { UCTabHero, heroButtonStyle } from '../../../components/uc-tab-hero';
import { dock, radii, workplace } from '../../../design/tokens';
import { GroupMark } from '../../workspaces/components/group-mark';

import type { WorkspaceItem } from '../../workspaces/workspace-types';

/** Giới hạn của Core API cho một câu hỏi. */
export const MIN_QUESTION = 3;
export const MAX_QUESTION = 2000;

interface AssistantHeroProps {
  readonly group: WorkspaceItem | null;
  readonly onPickGroup: () => void;
  /** Mở cuộc trò chuyện mới trống trong nhóm đang chọn. */
  readonly onNewChat: () => void;
  readonly onAsk: (question: string) => void;
}

/**
 * Dải đầu của màn Trợ lý AI: tiêu đề, và ô hỏi ngay kèm nhóm sẽ hỏi.
 *
 * Nhóm luôn hiện rõ trên ô hỏi, nên không thể vô tình hỏi trên tài liệu của
 * một nhóm khác.
 */
export function AssistantHero({ group, onPickGroup, onNewChat, onAsk }: AssistantHeroProps) {
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const canSend = group !== null && group.documentCount > 0 && trimmed.length >= MIN_QUESTION;

  const send = () => {
    if (!canSend) return;
    onAsk(trimmed);
    setText('');
  };

  return (
    <UCTabHero
      title="Trợ lý AI"
      subtitle="Hỏi trên tài liệu của nhóm, câu trả lời luôn kèm nguồn trích dẫn."
      action={
        <Pressable
          style={({ pressed }) => [heroButtonStyle, pressed && styles.pressed]}
          onPress={onNewChat}
          disabled={group === null}
          accessibilityRole="button"
          accessibilityLabel="Cuộc trò chuyện mới"
          testID="assistant-new-chat"
        >
          <UCIcon name="add" size={22} color="#FFFFFF" />
        </Pressable>
      }
    >
      <View style={styles.card}>
        <Pressable style={styles.groupChip} onPress={onPickGroup} accessibilityRole="button" testID="assistant-group-chip">
          {group && <GroupMark workspaceId={group.id} name={group.name} size={22} />}
          <Text style={styles.groupLabel}>Hỏi trong</Text>
          <Text style={styles.groupName} numberOfLines={1}>{group?.name ?? 'Chọn nhóm'}</Text>
          <UCIcon name="keyboard-arrow-down" size={18} color={workplace.inkMuted} />
        </Pressable>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={group ? `Hỏi kho ${group.name}...` : 'Chọn một nhóm để hỏi'}
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={MAX_QUESTION}
            editable={group !== null}
            testID="assistant-question-input"
          />
          <Pressable
            style={[styles.send, canSend && styles.sendActive]}
            onPress={send}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Gửi câu hỏi"
            accessibilityState={{ disabled: !canSend }}
            testID="assistant-send"
          >
            <UCIcon name="arrow-upward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <Text style={styles.hint}>
          {group && group.documentCount === 0
            ? 'Nhóm này chưa có tài liệu nên chưa hỏi được.'
            : `Chỉ trả lời từ tài liệu của nhóm ${group?.name ?? ''}.`}
        </Text>
      </View>
    </UCTabHero>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  card: { gap: 10, marginTop: 16, padding: 12, borderRadius: 22, backgroundColor: workplace.card },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    maxWidth: '100%',
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: radii.full,
    backgroundColor: workplace.chip,
  },
  groupLabel: { color: workplace.inkMuted, fontSize: 13 },
  groupName: { flexShrink: 1, color: workplace.ink, fontSize: 13.5, fontFamily: 'Inter_700Bold' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingVertical: 10, paddingHorizontal: 4, fontSize: 16, color: workplace.ink },
  send: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C7CCD8' },
  sendActive: { backgroundColor: dock.accent },
  hint: { color: workplace.inkMuted, fontSize: 12 },
});
