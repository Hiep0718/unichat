/**
 * The groups the sidebar lists, kept apart from the component so Fast Refresh
 * can reload the component on its own.
 */

/** A group as the sidebar lists it. */
export interface SideNavGroup {
  readonly id: string;
  readonly name: string;
}

/**
 * Puts the open group in the list even when it is not on the first page the
 * sidebar loads, so it can always be marked.
 *
 * @param groups the groups the sidebar loaded
 * @param active the open group, when known
 * @returns the list with the open group present exactly once
 */
export function withActiveGroup(
  groups: readonly SideNavGroup[],
  active: SideNavGroup | null,
): readonly SideNavGroup[] {
  if (!active || groups.some((group) => group.id === active.id)) {
    return groups;
  }
  return [active, ...groups];
}
