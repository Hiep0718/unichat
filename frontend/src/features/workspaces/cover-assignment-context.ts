/**
 * Where the page publishes which default picture each group is wearing, and
 * how a card reads its own back.
 *
 * Split from the provider so this file exports no component: a module that
 * mixes components with hooks and constants defeats fast refresh, and the
 * lint rule that says so is right.
 */
import { createContext, useContext } from 'react';

import { defaultCoverFor } from './default-covers';
import type { CoverIdentity } from './default-covers';

/** Null outside a provider, which is a supported case — see the hook. */
export const CoverAssignmentContext =
  createContext<ReadonlyMap<string, CoverIdentity> | null>(null);

/**
 * How this group should look where it has uploaded nothing.
 *
 * Outside a provider it falls back to the plain hash. That is right rather
 * than a degradation: a repeat needs two cards, and a group's own page draws
 * one.
 *
 * @param workspaceId the group being drawn
 * @returns the picture for a card, and the colour for a small mark
 */
export function useAssignedCover(workspaceId: string): CoverIdentity {
  const assignment = useContext(CoverAssignmentContext);
  return assignment?.get(workspaceId) ?? defaultCoverFor(workspaceId);
}
