import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { radii, spacing } from '../../../design/tokens';
import { shadows } from '../../../design/shadows';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { WorkspaceCover } from './workspace-cover';

import type { IconName } from '../../../components/uc-icon';
import type { WorkspaceItem } from '../workspace-types';

interface WorkspaceQuickCardProps {
  readonly workspace: WorkspaceItem;
  /** Đánh dấu thẻ mới nhất; chỉ một thẻ trong hàng mang nó. */
  readonly latest?: boolean;
  readonly onPress: (id: string) => void;
}

const VISIBILITY: Readonly<Record<string, { label: string; icon: IconName }>> = {
  PUBLIC: { label: 'Công khai', icon: 'public' },
  SHARED: { label: 'Được chia sẻ', icon: 'group-add' },
  PRIVATE: { label: 'Riêng tư', icon: 'lock' },
};

/**
 * Bề rộng thẻ và chiều cao của nó.
 *
 * Mọi ảnh bìa đi kèm là 1000x688, tức tỷ lệ 16/11. Thẻ giữ đúng tỷ lệ đó,
 * nên `resizeMode="cover"` không phải cắt gì cả.
 */
const CARD_WIDTH = 300;
const CARD_HEIGHT = Math.round((CARD_WIDTH * 11) / 16);

/** Khoảng thời gian từ lúc cập nhật tới giờ, viết gọn. */
function since(updatedAt?: string): string {
  if (!updatedAt) return 'chưa rõ';
  const ms = Date.now() - Date.parse(updatedAt);
  if (Number.isNaN(ms)) return 'chưa rõ';

  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'vừa xong';
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return `${Math.floor(days / 7)} tuần trước`;
}

/**
 * Thẻ trong hàng "Truy cập nhanh".
 *
 * Cùng một cách dựng với thẻ trong danh sách bên dưới: ảnh tràn kín cả thẻ,
 * một lớp tối phủ lên, rồi chữ viết đè lên ảnh. Bản trước tách ảnh thành một
 * dải ở trên rồi thêm một chân trắng mang tên và số liệu, nên hai hàng thẻ
 * trên cùng màn hình đọc ra là hai thành phần khác nhau chứ không phải cùng
 * một thứ ở hai cỡ.
 */
export function WorkspaceQuickCard({
  workspace,
  latest = false,
  onPress,
}: WorkspaceQuickCardProps) {
  const badge = VISIBILITY[workspace.visibility] ?? VISIBILITY.PRIVATE!;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(workspace.id)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Mở nhóm ${workspace.name}`}
    >
      <View style={styles.coverFill} pointerEvents="none">
        <WorkspaceCover
          workspaceId={workspace.id}
          name={workspace.name}
          {...(workspace.topics ? { topics: workspace.topics } : {})}
        />
      </View>

      {/* Lớp tối cho chữ đọc được trên bất kỳ bức ảnh nào. */}
      <View style={styles.scrim} pointerEvents="none" />

      <View style={styles.top}>
        {latest ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>Mới nhất</Text>
          </View>
        ) : (
          <View />
        )}

        <View style={styles.chip}>
          <UCIcon name={badge.icon} size={12} color="#FFFFFF" />
          <Text style={styles.chipText}>{badge.label}</Text>
        </View>
      </View>

      <View style={styles.foot}>
        <Text style={styles.name} numberOfLines={2}>
          {workspace.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {workspace.documentCount} tài liệu · {since(workspace.updatedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: spacing.md,
    ...shadows.card,
  },

  /** Ảnh và lớp tối trải kín thẻ, nằm dưới mọi nội dung. */
  coverFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 12, 24, 0.52)',
  },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  chipText: { ...typography.labelSm, color: '#FFFFFF', fontWeight: '700' },

  foot: {},
  name: { ...typography.bodyLg, color: '#FFFFFF', fontWeight: '700' },
  meta: {
    ...typography.labelSm,
    marginTop: 3,
    color: 'rgba(255, 255, 255, 0.82)',
  },
});
