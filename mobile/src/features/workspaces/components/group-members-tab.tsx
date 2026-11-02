/**
 * Ai đang ở trong nhóm, mỗi người một dòng.
 *
 * Core API chỉ trả danh sách này cho chủ sở hữu, nên màn hình nói thẳng điều đó
 * với người khác thay vì hiện một danh sách rỗng trông như nhóm không có ai.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

import { colors, radii, spacing } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { MemberAvatar } from '../../account/components/member-avatar';
import { toAvatarColorKey } from '../../account/avatar-colours';

import type { GroupMember, WorkspaceRole } from '../workspace-types';

interface GroupMembersTabProps {
  readonly members: readonly GroupMember[];
  readonly loading: boolean;
  /** Vai trò của người đang xem; chỉ chủ sở hữu đọc được danh sách này. */
  readonly isOwner: boolean;
  /** Để đánh dấu dòng của chính người đang xem. */
  readonly currentUserId: string;
  readonly onInvite: () => void;
}

/** Tên tiếng Việt của vai trò, giống hệt bản web. */
const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: 'Chủ sở hữu',
  EDITOR: 'Biên tập viên',
  VIEWER: 'Người xem',
};

export function GroupMembersTab({
  members,
  loading,
  isOwner,
  currentUserId,
  onInvite,
}: GroupMembersTabProps) {
  if (!isOwner) {
    return (
      <View style={styles.notice}>
        <UCIcon name="lock-outline" size={22} color={colors.onSurfaceVariant} />
        <Text style={styles.noticeText}>
          Chỉ chủ sở hữu xem được danh sách thành viên của nhóm.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.notice}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {members.map((member, index) => (
        <MemberRow
          key={member.userId}
          member={member}
          isSelf={member.userId === currentUserId}
          isFirst={index === 0}
        />
      ))}

      {/* Ở cuối thẻ chứ không phải trên đầu: mời ai đó là việc làm sau khi đã
          nhìn xem trong nhóm hiện có những ai. */}
      <TouchableOpacity
        style={[styles.inviteRow, members.length > 0 && styles.rowDivider]}
        onPress={onInvite}
        accessibilityRole="button"
        accessibilityLabel="Mời thành viên"
      >
        <UCIcon name="person-add" size={20} color={colors.primary} />
        <Text style={styles.inviteText}>Mời thành viên</Text>
      </TouchableOpacity>
    </View>
  );
}

interface MemberRowProps {
  readonly member: GroupMember;
  readonly isSelf: boolean;
  readonly isFirst: boolean;
}

/** Một thành viên: ảnh đại diện, địa chỉ, và họ được làm gì trong nhóm. */
function MemberRow({ member, isSelf, isFirst }: MemberRowProps) {
  const name = member.displayName?.trim() || member.email;
  const role = ROLE_LABEL[member.role] ?? member.role;

  return (
    <View style={[styles.row, !isFirst && styles.rowDivider]}>
      <MemberAvatar
        name={name}
        size={40}
        userId={member.userId}
        hasAvatar={member.hasAvatar}
        avatarColor={toAvatarColorKey(member.avatarColor)}
      />

      <View style={styles.identity}>
        <Text style={styles.email} numberOfLines={1}>
          {member.email}
        </Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>
            {role}
            {isSelf ? ' · Bạn' : ''}
          </Text>
        </View>
      </View>

      {/* Chủ sở hữu không gỡ được: nhóm không có chủ là nhóm không ai quản trị
          được nữa. */}
      {member.role !== 'OWNER' && (
        <UCIcon name="person-remove" size={20} color={colors.outline} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  email: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  roleText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
  },
  inviteText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  noticeText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
});
