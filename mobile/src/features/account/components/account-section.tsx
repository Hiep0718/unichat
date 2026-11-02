import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { shadows } from '../../../design/shadows';

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

interface AccountSectionProps {
  /** Tiêu đề ngắn, hiển thị in hoa. */
  readonly title: string;
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Thẻ trắng bao một nhóm thiết lập trong màn hình Tài khoản.
 *
 * Các thẻ tách nhau bằng độ nổi chứ không bằng viền, giống quy ước `--ws-*`
 * bên web: một giao diện mà hộp nào cũng có đường kẻ đọc ra như bản phác thảo.
 */
export function AccountSection({ title, children, style }: AccountSectionProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    ...shadows.md,
  },
  title: {
    color: '#94A3B8',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.9,
    marginBottom: 14,
  },
});
