/**
 * Pure navigation helpers shared by desktop sidebar and mobile navigation.
 * Kept separate from components so Fast Refresh and unit tests stay focused.
 */
import type { WorkspaceRole } from '../features/workspaces/workspace-schema';

/** A group as navigation lists render it. */
export interface SideNavGroup {
  readonly id: string;
  readonly name: string;
}

/** Minimal user shape needed for authoritative admin navigation visibility. */
export interface NavAuthUser {
  readonly systemRole?: string;
  readonly status?: string;
}

const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: 'Chủ sở hữu',
  EDITOR: 'Biên tập',
  VIEWER: 'Thành viên',
};

/**
 * Grants admin navigation strictly from the authoritative backend role and
 * active account status — never from email or display name substrings.
 */
export function isAuthoritativeAdmin(user: NavAuthUser | null | undefined): boolean {
  return user?.systemRole === 'ADMIN' && user?.status === 'ACTIVE';
}

/**
 * Checks whether a navigation route matches the current pathname.
 *
 * @param pathname current location pathname
 * @param href destination route path
 * @param exact when true, requires an exact match instead of prefix matching
 */
export function isNavPathActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Ensures an open member group appears in the list even if it sits beyond page 0.
 * Never inserts a public group the user has not joined into "Nhóm của bạn".
 */
export function withActiveGroup(
  groups: readonly SideNavGroup[],
  active: SideNavGroup | null,
  isMember = true,
): readonly SideNavGroup[] {
  if (!active || !isMember || groups.some((group) => group.id === active.id)) {
    return groups;
  }
  return [active, ...groups];
}

/**
 * Returns joined groups other than the currently open workspace for quick switching.
 */
export function otherJoinedGroups(
  groups: readonly SideNavGroup[],
  activeGroupId: string | undefined,
): readonly SideNavGroup[] {
  if (!activeGroupId) return groups;
  return groups.filter((group) => group.id !== activeGroupId);
}

/** Formats a workspace membership role in Vietnamese, including guest previews. */
export function workspaceRoleLabel(role: WorkspaceRole | null): string {
  return role ? WORKSPACE_ROLE_LABELS[role] : 'Chưa tham gia';
}
