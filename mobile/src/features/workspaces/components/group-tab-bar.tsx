/**
 * Thanh chuyển giữa các mục của một nhóm.
 *
 * Số đếm đi liền sau tên, ngăn bằng dấu chấm giữa, chứ không nằm trong một viên
 * pill riêng: trên màn hẹp bốn pill cùng lúc biến hàng tab thành một dãy đốm
 * tranh nhau chú ý với chính cái tên chúng đang đếm.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import { colors, spacing } from '../../../design/tokens';
import { typography } from '../../../design/typography';

/** Các mục của nhóm, theo thứ tự đọc. */
export type GroupTabKey = 'posts' | 'documents' | 'members' | 'about';

export interface GroupTabSpec {
  readonly key: GroupTabKey;
  readonly label: string;
  /**
   * Bao nhiêu thứ nằm trong mục đó. Bỏ trống, hoặc bằng 0, thì không hiện:
   * "Tệp · 0" là một cách nặng nề hơn để nói đúng điều mà mục rỗng tự nói khi
   * mở ra. "Giới thiệu" không bao giờ có số — mô tả thì có hoặc không.
   */
  readonly count?: number | undefined;
}

interface GroupTabBarProps {
  readonly tabs: readonly GroupTabSpec[];
  readonly active: GroupTabKey;
  readonly onChange: (key: GroupTabKey) => void;
}

export function GroupTabBar({ tabs, active, onChange }: GroupTabBarProps) {
  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 ? ` · ${tab.count}` : ''}
              </Text>
              <View style={[styles.underline, isActive && styles.underlineActive]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  row: {
    paddingHorizontal: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.sm,
    paddingTop: 14,
    alignItems: 'center',
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  // Luôn chiếm chỗ, kể cả khi trong suốt: nếu chỉ tab đang chọn mới có gạch
  // chân thì cả hàng nhích lên xuống mỗi lần đổi tab.
  underline: {
    height: 2,
    alignSelf: 'stretch',
    marginTop: 10,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  underlineActive: {
    backgroundColor: colors.primary,
  },
});
