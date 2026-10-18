/**
 * What each visibility level means, in one place.
 *
 * Six components used to declare their own copy of this, which is how the
 * product ended up telling a user that PRIVATE meant "chỉ mình tôi" on one
 * screen and "chỉ thành viên được mời" on another, and promising an invite
 * link that does not exist. The wording here is the wording everywhere.
 *
 * Mirrors `WorkspaceVisibilityPolicy` on the Core API, which enforces it.
 */
import type { WorkspaceRole, WorkspaceVisibility } from './workspace-schema';

export interface VisibilityOption {
  readonly value: WorkspaceVisibility;
  /** Material symbol drawn on badges and in the picker. */
  readonly icon: string;
  /** Short name, for a badge or a chip. */
  readonly label: string;
  /** One line under the name in a picker. States what the level does. */
  readonly description: string;
  /** Prefixed form for a page heading, e.g. the group header. */
  readonly groupLabel: string;
}

/** Ordered from most closed to most open; pickers render them in this order. */
export const VISIBILITY_OPTIONS: readonly VisibilityOption[] = [
  {
    value: 'PRIVATE',
    icon: 'lock',
    label: 'Riêng tư',
    description: 'Chỉ mình bạn truy cập. Không thể thêm thành viên.',
    groupLabel: 'Nhóm riêng tư',
  },
  {
    value: 'SHARED',
    icon: 'group_add',
    label: 'Được chia sẻ',
    description: 'Bạn mời thành viên bằng email. Không hiện ở trang Khám phá.',
    groupLabel: 'Nhóm được chia sẻ',
  },
  {
    value: 'PUBLIC',
    icon: 'public',
    label: 'Công khai',
    description: 'Hiện ở trang Khám phá, ai cũng có thể tự tham gia.',
    groupLabel: 'Nhóm công khai',
  },
];

const BY_VALUE = new Map<WorkspaceVisibility, VisibilityOption>(
  VISIBILITY_OPTIONS.map((option) => [option.value, option]),
);

/**
 * Looks up one level.
 *
 * Falls back to PRIVATE rather than throwing, because a card must still render
 * if the API ever grows a level this build does not know, and the most closed
 * reading is the safe one to show.
 */
export function visibilityOption(value: WorkspaceVisibility): VisibilityOption {
  return BY_VALUE.get(value) ?? VISIBILITY_OPTIONS[0]!;
}

/**
 * What each role means in one phrase, for the places that name a role to
 * someone who has not joined yet and has no idea what EDITOR implies.
 */
export const ROLE_SUMMARY: Record<WorkspaceRole, string> = {
  OWNER: 'Chủ sở hữu',
  EDITOR: 'Biên tập viên — đọc, hỏi và đóng góp tài liệu',
  VIEWER: 'Thành viên — đọc và hỏi trợ lý AI',
};

/** Whether this level allows members at all. Mirrors the Core API rule. */
export function allowsMembers(value: WorkspaceVisibility): boolean {
  return value !== 'PRIVATE';
}
