import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { UCIcon } from '../../../components/uc-icon';
import { radii, workplace } from '../../../design/tokens';
import { useToast } from '../../../lib/toast-context';
import { feedApi } from '../feed-api';
import { REACTIONS, REACTION_EMOJI, reactionLabel } from '../reactions';

import type { ReactionSummary, ReactionType } from '../feed-types';

interface ReactionBarProps {
  readonly targetType: 'DISCUSSION' | 'DISCUSSION_REPLY';
  readonly targetId: string;
  readonly summary: ReactionSummary;
  /** Báo bản tổng hợp mới để nơi gọi giữ cache đúng. */
  readonly onChange?: (summary: ReactionSummary) => void;
  readonly compact?: boolean;
}

/** Những loại đã có người thả, theo thứ tự hiển thị chuẩn. */
export function usedTypes(summary: ReactionSummary): ReactionType[] {
  return REACTIONS.map((r) => r.type).filter((type) => (summary.counts[type] ?? 0) > 0);
}

/**
 * Cảm xúc trên một bài hoặc bình luận.
 *
 * Mỗi người giữ tối đa một cảm xúc: chọn loại khác là đổi, chọn lại đúng loại
 * đang có là gỡ. Số hiện ra luôn là số máy chủ trả về sau khi lưu.
 */
export function ReactionBar({ targetType, targetId, summary, onChange, compact = false }: ReactionBarProps) {
  const { showToast } = useToast();
  const [current, setCurrent] = useState(summary);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setCurrent(summary), [summary]);

  const apply = async (type: ReactionType) => {
    setPickerOpen(false);
    if (Platform.OS === 'ios') void Haptics.selectionAsync();
    setSaving(true);
    try {
      const next = await feedApi.toggleReaction(targetType, targetId, type);
      setCurrent(next);
      onChange?.(next);
    } catch {
      showToast({ message: 'Không lưu được cảm xúc. Vui lòng thử lại.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const mine = current.myReaction;
  const used = usedTypes(current);

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.trigger, mine && styles.triggerMine, pressed && styles.pressed]}
        onPress={() => setPickerOpen(true)}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={mine ? `Cảm xúc của bạn: ${reactionLabel(mine)}` : 'Bày tỏ cảm xúc'}
        testID={`reaction-trigger-${targetId}`}
      >
        {mine
          ? <Text style={styles.emoji}>{REACTION_EMOJI[mine]}</Text>
          : <UCIcon name="add-reaction" size={compact ? 15 : 17} color={workplace.inkMuted} />}
        <Text style={[styles.triggerText, mine && styles.triggerTextMine]}>
          {mine ? reactionLabel(mine) : 'Thích'}
        </Text>
      </Pressable>

      {used.length > 0 && (
        <View style={styles.tally} accessibilityLabel={`${current.total} lượt bày tỏ cảm xúc`}>
          <Text style={styles.tallyEmojis}>{used.map((type) => REACTION_EMOJI[type]).join('')}</Text>
          <Text style={styles.tallyCount}>{current.total}</Text>
        </View>
      )}

      <ReactionPicker visible={pickerOpen} mine={mine} onPick={apply} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

interface ReactionPickerProps {
  readonly visible: boolean;
  readonly mine: ReactionType | null;
  readonly onPick: (type: ReactionType) => void;
  readonly onClose: () => void;
}

/** Khay bảy cảm xúc, nổi giữa màn hình; chạm ra ngoài để đóng. */
function ReactionPicker({ visible, mine, onPick, onClose }: ReactionPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Đóng">
        <View style={styles.tray} accessibilityRole="menu">
          {REACTIONS.map((reaction) => (
            <Pressable
              key={reaction.type}
              style={({ pressed }) => [styles.option, mine === reaction.type && styles.optionMine, pressed && styles.optionPressed]}
              onPress={() => onPick(reaction.type)}
              accessibilityRole="menuitem"
              accessibilityLabel={reaction.label}
              testID={`reaction-option-${reaction.type}`}
            >
              <Text style={styles.optionEmoji}>{reaction.emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.md,
  },
  triggerMine: { backgroundColor: workplace.accentSoft },
  pressed: { opacity: 0.6 },
  emoji: { fontSize: 15 },
  triggerText: { color: workplace.inkMuted, fontSize: 13, fontFamily: 'Inter_500Medium' },
  triggerTextMine: { color: workplace.accent, fontFamily: 'Inter_700Bold' },
  tally: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tallyEmojis: { fontSize: 13 },
  tallyCount: { color: workplace.inkMuted, fontSize: 13, fontFamily: 'Inter_500Medium' },
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  tray: {
    flexDirection: 'row',
    gap: 2,
    padding: 6,
    borderRadius: 32,
    backgroundColor: workplace.card,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  option: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  optionMine: { backgroundColor: workplace.accentSoft },
  optionPressed: { transform: [{ scale: 1.2 }] },
  optionEmoji: { fontSize: 26 },
});
