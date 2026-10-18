/**
 * Which default picture each group on the page is wearing.
 *
 * The decision cannot be made by a card on its own: avoiding a repeat means
 * knowing what every other group on the page already took. It also must not be
 * made twice — the quick-access row and the grid below show the same groups,
 * and two separate decisions would disagree.
 *
 * So the page that holds the full list decides once and publishes the answer
 * here. A card asks for its own through `useAssignedCover` in
 * {@link ./cover-assignment-context}.
 */
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { CoverAssignmentContext } from './cover-assignment-context';
import { assignCovers } from './default-covers';

interface CoverAssignmentProviderProps {
  /** Every group on the page, including ones a filter is currently hiding. */
  readonly workspaceIds: readonly string[];
  readonly children: ReactNode;
}

/**
 * Publishes one assignment for everything rendered inside it.
 *
 * Pass every group the page knows about, not the filtered subset: a group must
 * not change picture because a search box was typed into.
 */
export function CoverAssignmentProvider({
  workspaceIds,
  children,
}: CoverAssignmentProviderProps) {
  // Keyed on the ids themselves rather than the array, which a parent rebuilds
  // on every render; without this every card would remount its picture.
  const key = workspaceIds.join(',');
  const assignment = useMemo(() => assignCovers(workspaceIds), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CoverAssignmentContext.Provider value={assignment}>
      {children}
    </CoverAssignmentContext.Provider>
  );
}
