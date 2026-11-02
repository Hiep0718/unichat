/**
 * Nhóm này để làm gì, trợ lý của nó dựa vào đâu, và vài con số mô tả nó.
 *
 * Trên màn hẹp các dữ kiện xếp thành một danh sách dọc thay vì một cột bên
 * cạnh như bản web: không có chỗ cho hai cột, và đọc lần lượt vẫn đúng thứ tự.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { colors, radii, spacing } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';

import type { WorkspaceDetail, WorkspaceRole } from '../workspace-types';

interface GroupAboutTabProps {
  readonly workspace: WorkspaceDetail;
  readonly isOwner: boolean;
  readonly onEditDescription: () => void;
  readonly onAskAssistant: () => void;
}

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: 'Chủ sở hữu',
  EDITOR: 'Biên tập viên',
  VIEWER: 'Người xem',
};

const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: 'Công khai',
  SHARED: 'Chia sẻ',
  PRIVATE: 'Riêng tư',
};

/** Định dạng ngày theo cách đọc của tiếng Việt. */
function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export function GroupAboutTab({
  workspace,
  isOwner,
  onEditDescription,
  onAskAssistant,
}: GroupAboutTabProps) {
  const hasDescription = Boolean(workspace.description?.trim());
  const topics = workspace.topics ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.heading}>Mô tả</Text>
          {isOwner && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={onEditDescription}
              accessibilityRole="button"
              accessibilityLabel={hasDescription ? 'Chỉnh sửa mô tả' : 'Thêm mô tả'}
            >
              <UCIcon name="edit" size={14} color={colors.primary} />
              <Text style={styles.editText}>{hasDescription ? 'Chỉnh sửa' : 'Thêm mô tả'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mô tả trống là một việc để làm, không chỉ là một dữ kiện, nên chỗ
            trống nói rõ viết nó ra để làm gì. */}
        <Text style={styles.body}>
          {hasDescription
            ? workspace.description?.trim()
            : 'Nhóm này chưa có mô tả. Viết vài dòng để người mới biết nhóm học gì.'}
        </Text>

        {topics.length > 0 && (
          <View style={styles.topicRow}>
            {topics.map((topic) => (
              <View key={topic} style={styles.topicChip}>
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.aiCard}
        onPress={onAskAssistant}
        accessibilityRole="button"
        accessibilityLabel="Bắt đầu hỏi Trợ lý AI"
      >
        <Text style={styles.aiTitle}>Trợ lý AI của nhóm</Text>
        <Text style={styles.aiBody}>
          Trả lời dựa trên các tệp của nhóm, kèm trích dẫn. Thiếu căn cứ trong tài
          liệu thì trợ lý từ chối thay vì đoán.
        </Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Fact label="Vai trò của bạn">
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>
              {ROLE_LABEL[workspace.userRole ?? 'VIEWER'] ?? 'Người xem'}
            </Text>
          </View>
        </Fact>
        <Fact label="Quyền truy cập" divider>
          <Text style={styles.factValue}>
            {VISIBILITY_LABEL[workspace.visibility] ?? workspace.visibility}
          </Text>
        </Fact>
        <Fact label="Kiểm duyệt tài liệu" divider>
          {/* Luôn bật: tệp do thành viên tải lên cần chủ nhóm duyệt trước khi
              trở thành nguồn cho trợ lý. Đây là quy tắc của Core API chứ không
              phải một công tắc trong nhóm, nên nó là dữ kiện chứ không phải
              lựa chọn. */}
          <Text style={styles.factValue}>Đang bật</Text>
        </Fact>
        <Fact label="Ngày tạo" divider>
          <Text style={styles.factValue}>{formatDate(workspace.createdAt)}</Text>
        </Fact>
      </View>
    </View>
  );
}

interface FactProps {
  readonly label: string;
  readonly divider?: boolean;
  readonly children: React.ReactNode;
}

/** Một dữ kiện: tên bên trái, giá trị bên phải. */
function Fact({ label, divider = false, children }: FactProps) {
  return (
    <View style={[styles.fact, divider && styles.factDivider]}>
      <Text style={styles.factLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  heading: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.primaryFixed,
  },
  editText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '700',
  },
  body: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 21,
  },
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  topicChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  topicText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  // Nghịch với nền trang, giống thẻ trợ lý ở bản web: cùng một lời mời ở hai
  // nơi thì không nên trông như hai thứ khác nhau.
  aiCard: {
    backgroundColor: '#0B1220',
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  aiTitle: {
    ...typography.headlineMd,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 6,
  },
  aiBody: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 20,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 13,
  },
  factDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  factLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  factValue: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  rolePill: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.primaryFixed,
  },
  rolePillText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '700',
  },
});
