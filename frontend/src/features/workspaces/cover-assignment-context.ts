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
import { topicCoverFor } from './topic-covers';

/** Null outside a provider, which is a supported case — see the hook. */
export const CoverAssignmentContext =
  createContext<ReadonlyMap<string, CoverIdentity> | null>(null);

/**
 * How this group should look where it has uploaded nothing.
 *
 * What the group is about wins where it is known, because a picture of what
 * a group holds says more than one picked to be merely unlike its neighbours.
 * It costs the no-repeat guarantee for groups that share a topic: two groups
 * on databases wear the same picture, deliberately, and are still told apart
 * by the name and counts the card writes over it.
 *
 * Outside a provider, and for a group carrying no topic, it falls back to the
 * plain hash. That is right rather than a degradation: a repeat needs two
 * cards, and a group's own page draws one.
 *
 * @param workspaceId the group being drawn
 * @param topics what the group is about, where the caller knows it
 * @returns the picture for a card, and the colour for a small mark
 */
export function useAssignedCover(
  workspaceId: string,
  topics?: readonly string[],
): CoverIdentity {
  const assignment = useContext(CoverAssignmentContext);
  return (
    topicCoverFor(topics) ??
    assignment?.get(workspaceId) ??
    defaultCoverFor(workspaceId)
  );
}
