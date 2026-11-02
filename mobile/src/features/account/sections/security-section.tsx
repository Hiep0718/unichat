import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { UCIcon } from '../../../components/uc-icon';
import { AccountSection } from '../components/account-section';

import type { IconName } from '../../../components/uc-icon';

interface SecuritySectionProps {
  readonly onLogout: () => void;
}

/**
 * Khu vực "Bảo mật": đổi mật khẩu và đăng xuất.
 *
 * Đăng xuất nằm ở đây thay vì một nút riêng cuối trang: nó là một hành động
 * về phiên đăng nhập, và gom lại thì người dùng chỉ phải tìm ở một chỗ.
 */
export function SecuritySection({ onLogout }: SecuritySectionProps) {
  const confirmLogout = () => {
    Alert.alert('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng UniChat?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <AccountSection title="Bảo mật">
      <SecurityRow
        icon="lock-outline"
        label="Đổi mật khẩu"
        onPress={() => router.push('/account/change-password')}
      />
      <View style={styles.divider} />
      <SecurityRow icon="logout" label="Đăng xuất" danger onPress={confirmLogout} />
    </AccountSection>
  );
}

interface SecurityRowProps {
  readonly icon: IconName;
  readonly label: string;
  readonly danger?: boolean;
  readonly onPress: () => void;
}

/** Một dòng hành động: biểu tượng, nhãn, mũi tên. */
function SecurityRow({ icon, label, danger = false, onPress }: SecurityRowProps) {
  const tint = danger ? '#DC2626' : '#0F172A';
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <UCIcon name={icon} size={19} color={tint} />
      <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
      <UCIcon name="chevron-right" size={20} color="#CBD5E1" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowLabel: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14.5 },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
});
