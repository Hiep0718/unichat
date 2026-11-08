import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { UCIcon } from '../../../components/uc-icon';
import { dock, radii, workplace } from '../../../design/tokens';

/** Giới hạn của Core API cho một câu hỏi. */
const MIN_QUESTION = 3;
const MAX_QUESTION = 2000;

interface ChatInputBarProps {
  readonly onSend: (text: string, allowExternalKnowledge: boolean) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  /** Số tài liệu trợ lý đọc được; bỏ trống thì ẩn nút nguồn. */
  readonly sourceCount?: number;
  readonly onOpenSources?: () => void;
}

interface ModeChipProps {
  readonly label: string;
  readonly active: boolean;
  readonly onPress: () => void;
  readonly testID: string;
}

function ModeChip({ label, active, onPress, testID }: ModeChipProps) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      testID={testID}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Ô hỏi ở đáy màn chat.
 *
 * "Chỉ tài liệu" giữ câu trả lời trong tài liệu của nhóm; "Mở rộng" cho phép
 * trợ lý dùng thêm kiến thức ngoài, và câu trả lời khi đó được đánh dấu rõ.
 */
export function ChatInputBar({ onSend, disabled = false, placeholder = 'Hỏi trợ lý...', sourceCount, onOpenSources }: ChatInputBarProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const canSend = !disabled && text.trim().length >= MIN_QUESTION;

  const send = () => {
    if (!canSend) return;
    if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend(text.trim(), expanded);
    setText('');
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={MAX_QUESTION}
          editable={!disabled}
          testID="chat-text-input"
        />
        <Pressable
          style={[styles.send, canSend && styles.sendActive]}
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Gửi câu hỏi"
          accessibilityState={{ disabled: !canSend }}
          testID="chat-send-button"
        >
          <UCIcon name="arrow-upward" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={styles.row} accessibilityRole="radiogroup">
        <ModeChip label="Chỉ tài liệu" active={!expanded} onPress={() => setExpanded(false)} testID="mode-strict" />
        <ModeChip label="Mở rộng" active={expanded} onPress={() => setExpanded(true)} testID="mode-expanded" />
        {sourceCount !== undefined && onOpenSources && (
          <Pressable style={styles.sources} onPress={onOpenSources} accessibilityRole="button" testID="chat-sources-button">
            <UCIcon name="description" size={15} color={workplace.ink} />
            <Text style={styles.sourcesText}>{sourceCount} nguồn</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: 10, paddingHorizontal: 12, paddingTop: 10, backgroundColor: workplace.card, borderTopWidth: 1, borderTopColor: workplace.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 130,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: radii.xl,
    backgroundColor: workplace.chip,
    color: workplace.ink,
    fontSize: 16,
  },
  send: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C7CCD8' },
  sendActive: { backgroundColor: dock.accent },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1, borderColor: workplace.line, backgroundColor: workplace.card },
  chipActive: { backgroundColor: workplace.ink, borderColor: workplace.ink },
  chipText: { color: workplace.inkSoft, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  chipTextActive: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  sources: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: workplace.line,
  },
  sourcesText: { color: workplace.ink, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
