/**
 * Dải đầu của màn hình một nhóm: nhóm này là gì, và lối vào trợ lý của nó.
 *
 * Ảnh bìa chạy hẳn lên dưới thanh trạng thái, nên nút quay lại và menu nằm
 * **trên** ảnh và phải tự mang nền mờ của chúng: một biểu tượng trắng trên một
 * tấm ảnh bất kỳ thì có lúc đọc được, có lúc không.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { GroupMark } from './group-mark';
import { WorkspaceCover } from './workspace-cover';

import type { WorkspaceDetail } from '../workspace-types';

interface GroupHeroProps {
  readonly workspace: WorkspaceDetail;
  /** Số tệp và số thành viên như nhóm báo về. */
  readonly documentCount: number;
  readonly memberCount: number;
  readonly onBack: () => void;
  readonly onMenu: () => void;
  readonly onAskAssistant: () => void;
}

/** Tên tiếng Việt của mức hiển thị, như dòng phụ dưới tên nhóm viết ra. */
const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: 'Nhóm công khai',
  SHARED: 'Nhóm chia sẻ',
  PRIVATE: 'Nhóm riêng tư',
};

export function GroupHero({
  workspace,
  documentCount,
  memberCount,
  onBack,
  onMenu,
  onAskAssistant,
}: GroupHeroProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <WorkspaceCover
          workspaceId={workspace.id}
          name={workspace.name}
          topics={workspace.topics ?? []}
        />
        {/* Ảnh bìa là ảnh chụp, nên chữ trắng trên đó chỉ chắc đọc được khi có
            một lớp tối phủ lên; đậm dần xuống dưới vì chữ dồn ở nửa dưới. */}
        <LinearGradient
          colors={['rgba(8,20,16,0.55)', 'rgba(8,20,16,0.78)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <UCIcon name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Thêm tuỳ chọn"
        >
          <UCIcon name="more-horiz" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.identity}>
        <GroupMark workspaceId={workspace.id} name={workspace.name} size={56} />
        <View style={styles.titles}>
          <Text style={styles.name} numberOfLines={2}>
            {workspace.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {VISIBILITY_LABEL[workspace.visibility] ?? 'Nhóm'}
            {' · '}
            {memberCount} thành viên
            {' · '}
            {documentCount} tệp
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.askBtn}
        onPress={onAskAssistant}
        accessibilityRole="button"
        accessibilityLabel="Hỏi Trợ lý AI"
      >
        <UCIcon name="auto-awesome" size={18} color={colors.primary} />
        <Text style={styles.askText}>Hỏi Trợ lý AI</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    paddingBottom: spacing.md,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  // Nền riêng cho từng nút, vì phía sau là ảnh chứ không phải một màu biết trước.
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(8,20,16,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  titles: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.headlineXl,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  meta: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
  },
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radii.xl,
    backgroundColor: '#FFFFFF',
  },
  askText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
});
