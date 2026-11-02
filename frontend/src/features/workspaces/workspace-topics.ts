/**
 * The topic vocabulary, fetched rather than restated here.
 *
 * The visibility labels were copied into six components and drifted into four
 * contradictory descriptions of the same two levels. This list is longer and
 * likelier to grow, so the client never holds its own copy: the Core API
 * serves names, Vietnamese labels and icons from `WorkspaceTopic`.
 */
import { useQuery } from '@tanstack/react-query';

import { fetchJson } from '../../lib/api-client';

export interface WorkspaceTopicOption {
  /** The stored value, sent back when filtering or saving. */
  readonly name: string;
  readonly label: string;
  /** Material symbol drawn beside the label. */
  readonly icon: string;
  /** Band this sits under in the picker. Presentation only; never stored. */
  readonly group: string;
  /** That band's heading, sent along so the client needs no second lookup. */
  readonly groupLabel: string;
}

/** A topic that currently has discoverable workspaces behind it. */
export interface DiscoverableTopic extends WorkspaceTopicOption {
  readonly count: number;
}

/** How many topics one workspace may carry. Mirrors the Core API's own cap. */
export const MAX_TOPICS_PER_WORKSPACE = 3;

function getTopics(): Promise<readonly WorkspaceTopicOption[]> {
  return fetchJson('/workspaces/topics');
}

/**
 * Loads the vocabulary.
 *
 * An hour rather than forever: the list changes only on a deploy, but a tab
 * left open across one would otherwise keep offering the old topics with no
 * way to notice.
 */
export function useWorkspaceTopics() {
  return useQuery({
    queryKey: ['workspace-topics'],
    queryFn: getTopics,
    staleTime: 60 * 60 * 1000,
  });
}

function getDiscoverableTopics(): Promise<readonly DiscoverableTopic[]> {
  return fetchJson('/workspaces/explore/topics');
}

/**
 * Loads the topics worth offering as filters.
 *
 * Only those with something behind them. The vocabulary has twenty entries and
 * a young deployment has a handful of public groups, so a rail of every topic
 * would be mostly chips that lead to "không có kết quả" — which teaches people
 * the filter is broken. Counts move as groups are published and joined, so
 * unlike the vocabulary this is not cached indefinitely.
 */
export function useDiscoverableTopics() {
  return useQuery({
    queryKey: ['workspace-topics', 'discoverable'],
    queryFn: getDiscoverableTopics,
  });
}

/**
 * Looks topics up by name.
 *
 * Returns a lookup rather than a list because cards hold names and need
 * labels. A name the vocabulary does not know is skipped instead of rendered
 * raw: a workspace filed under a topic this build was not told about should
 * show nothing, not `NETWORK_SYSTEMS`.
 */
export function topicLookup(
  options: readonly WorkspaceTopicOption[] | undefined,
): Map<string, WorkspaceTopicOption> {
  return new Map((options ?? []).map((option) => [option.name, option]));
}
