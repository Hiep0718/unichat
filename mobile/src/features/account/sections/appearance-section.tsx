import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { shadows } from '../../../design/shadows';
import { AccountSection } from '../components/account-section';

/** Các chế độ hiển thị bản di động dự định hỗ trợ. */
type ThemeChoice = 'light' | 'dark';

const OPTIONS: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
];

const PENDING_HINT = 'Giao diện tối đang được hoàn thiện cho bản di động.';
const PENDING_NOTICE = 'Chưa chuyển được sang nền tối: bảng màu tối cho di động chưa sẵn sàng.';

/**
 * Khu vực "Giao diện": chọn giữa nền sáng và nền tối.
 *
 * Bản di động hiện chỉ có bảng màu sáng — mọi màn hình đang khai màu cố định
 * chứ không đọc từ một chủ đề. Ô "Tối" vẫn hiện để chỗ cho tính năng sắp tới,
 * nhưng nó nói rõ là chưa đổi được thay vì đổi trạng thái rồi không làm gì.
 */
export function AppearanceSection() {
  const [notice, setNotice] = useState(false);
  const choice: ThemeChoice = 'light';

  return (
    <AccountSection title="Giao diện">
      <View style={styles.track} accessibilityRole="radiogroup">
        {OPTIONS.map((option) => {
          const active = option.value === choice;
          return (
            <Pressable
              key={option.value}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setNotice(!active)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: !active }}
              accessibilityLabel={option.label}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        style={[styles.hint, notice && styles.hintLoud]}
        accessibilityLiveRegion="polite"
      >
        {notice ? PENDING_NOTICE : PENDING_HINT}
      </Text>
    </AccountSection>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: '#E8EDF5',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: { backgroundColor: '#FFFFFF', ...shadows.sm },
  optionText: { color: '#64748B', fontFamily: 'Inter_500Medium', fontSize: 14 },
  optionTextActive: { color: '#0F172A', fontFamily: 'Inter_600SemiBold' },
  hint: { color: '#94A3B8', fontFamily: 'Inter_400Regular', fontSize: 11.5, marginTop: 10 },
  hintLoud: { color: '#64748B' },
});
