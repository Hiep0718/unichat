/**
 * Các khối nhỏ của tab Nhóm: thanh chuyển "Nhóm của tôi / Khám phá", đầu
 * danh sách có nút Tạo nhóm, ô tìm kiếm, và hai trạng thái lỗi/rỗng.
 *
 * Chữ và kiểu bám theo trang danh sách nhóm của web (`workspace-list-page`):
 * thanh tab khung `ke`, mục đang chọn nền trắng chữ `muc`, không bóng đổ;
 * nút chính tô màu nhấn, bo tròn.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { UCIcon } from '../../../components/uc-icon';
import { button, colors, palette, radii, spacing } from '../../../design/tokens';
import { fonts, typography } from '../../../design/typography';

import type { IconName } from '../../../components/uc-icon';

/** Hai tab của màn Nhóm. */
export type WorkspaceTab = 'mine' | 'explore';

const TABS: readonly { key: WorkspaceTab; label: string; icon: IconName }[] = [
  { key: 'mine', label: 'Nhóm của tôi', icon: 'folder' },
  { key: 'explore', label: 'Khám phá', icon: 'travel-explore' },
];

interface WorkspaceSegmentProps {
  readonly value: WorkspaceTab;
  readonly onChange: (tab: WorkspaceTab) => void;
}

/** Thanh chuyển giữa nhóm của mình và nhóm công khai. */
export function WorkspaceSegment({ value, onChange }: WorkspaceSegmentProps) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {TABS.map((item) => {
        const on = value === item.key;
        return (
          <Pressable
            key={item.key}
            style={({ pressed }) => [styles.segmentBtn, on && styles.segmentBtnOn, pressed && styles.pressed]}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <UCIcon name={item.icon} size={16} color={on ? palette.muc : palette.mucMo} />
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface WorkspaceListHeadProps {
  readonly tab: WorkspaceTab;
  readonly count: number;
  readonly onCreate: () => void;
}

/** Tiêu đề danh sách, số lượng và nút Tạo nhóm (chỉ ở tab của mình). */
export function WorkspaceListHead({ tab, count, onCreate }: WorkspaceListHeadProps) {
  return (
    <View style={styles.listHead}>
      <Text style={styles.sectionTitle}>{tab === 'mine' ? 'Tất cả nhóm' : 'Nhóm công khai'}</Text>
      <Text style={styles.count}>{count}</Text>
      {tab === 'mine' ? (
        <Pressable
          style={({ pressed }) => [styles.create, pressed && styles.pressed]}
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="Tạo nhóm mới"
        >
          <UCIcon name="add" size={18} color={button.primaryInk} />
          <Text style={styles.createText}>Tạo nhóm</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface WorkspaceSearchProps {
  readonly value: string;
  readonly onChange: (text: string) => void;
}

/** Ô tìm nhóm theo tên hoặc mô tả. */
export function WorkspaceSearch({ value, onChange }: WorkspaceSearchProps) {
  return (
    <View style={styles.search}>
      <UCIcon name="search" size={18} color={palette.mucMo} />
      <TextInput
        style={styles.searchInput}
        placeholder="Tìm nhóm..."
        placeholderTextColor={palette.mucMo}
        value={value}
        onChangeText={onChange}
        returnKeyType="search"
        accessibilityLabel="Tìm nhóm"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm">
          <UCIcon name="close" size={16} color={palette.mucMo} />
        </Pressable>
      ) : null}
    </View>
  );
}

interface ListErrorProps {
  readonly message: string;
  readonly onRetry: () => void;
}

/** Tải thất bại: nói rõ lỗi và cho thử lại, không giả làm danh sách rỗng. */
export function WorkspaceListError({ message, onRetry }: ListErrorProps) {
  return (
    <View style={styles.empty}>
      <UCIcon name="error-outline" size={34} color={colors.error} />
      <Text style={styles.emptyTitle}>Không tải được dữ liệu</Text>
      <Text style={styles.emptyBody}>{message}</Text>
      <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.primaryText}>Thử lại</Text>
        <UCIcon name="refresh" size={16} color={button.primaryInk} />
      </Pressable>
    </View>
  );
}

interface ListEmptyProps {
  readonly tab: WorkspaceTab;
  readonly searching: boolean;
  readonly onCreate: () => void;
}

/** Không có nhóm nào để hiện, theo chữ của web. */
export function WorkspaceListEmpty({ tab, searching, onCreate }: ListEmptyProps) {
  const title = searching ? 'Không tìm thấy nhóm' : tab === 'mine' ? 'Chưa có nhóm nào' : 'Chưa có nhóm công khai';
  const body = searching
    ? 'Thử thay đổi từ khóa tìm kiếm.'
    : tab === 'mine' ? 'Tạo nhóm đầu tiên để bắt đầu tổ chức tài liệu của bạn.' : null;
  return (
    <View style={styles.empty}>
      <UCIcon name={searching ? 'search-off' : 'school'} size={34} color={colors.primary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {tab === 'mine' && !searching ? (
        <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={onCreate} accessibilityRole="button">
          <Text style={styles.primaryText}>Tạo nhóm</Text>
          <UCIcon name="add" size={16} color={button.primaryInk} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },

  segment: { flexDirection: 'row', gap: 3, padding: 4, borderRadius: radii.full, backgroundColor: palette.ke },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  segmentBtnOn: { backgroundColor: palette.nen },
  segmentText: { ...typography.labelMd, fontFamily: fonts.medium, color: palette.mucMo },
  segmentTextOn: { fontFamily: fonts.semibold, color: palette.muc },

  listHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionTitle: { ...typography.headlineMd, fontFamily: fonts.bold, color: palette.muc },
  count: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: palette.pillTrungNen,
    textAlign: 'center',
    ...typography.labelSm,
    fontFamily: fonts.bold,
    color: palette.pillTrungMuc,
  },
  create: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 12,
    paddingRight: 14,
    height: 38,
    borderRadius: button.radius,
    backgroundColor: button.primaryBg,
  },
  createText: { ...typography.labelMd, color: button.primaryInk },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: palette.nen,
    borderWidth: 1,
    borderColor: palette.vien,
  },
  searchInput: { flex: 1, paddingVertical: 12, ...typography.bodyMd, color: palette.muc },

  empty: {
    alignItems: 'center',
    gap: 10,
    padding: spacing.lg,
    borderRadius: radii['2xl'],
    backgroundColor: palette.nen,
    borderWidth: 1,
    borderColor: palette.vien,
  },
  emptyTitle: { ...typography.bodyLg, fontFamily: fonts.bold, color: palette.muc },
  emptyBody: { ...typography.bodySm, color: palette.mucNhat, textAlign: 'center' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: button.radius,
    backgroundColor: button.primaryBg,
  },
  primaryText: { ...typography.labelMd, fontFamily: fonts.bold, color: button.primaryInk },
});
