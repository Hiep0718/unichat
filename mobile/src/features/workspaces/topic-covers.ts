import type { ImageSourcePropType } from 'react-native';

import type { CoverIdentity } from './default-covers';

/**
 * The picture a group gets for what it is about, rather than for its id.
 *
 * Ported from frontend/src/features/workspaces/topic-covers.ts, keeping the
 * vocabulary, its order and the accents byte for byte. That is the point of
 * the port: a group on databases is the same picture in the browser and on a
 * phone, so a member recognises it on either.
 *
 * The pictures are bundled rather than fetched, for the reason the abstract
 * set is: the web serves them from /covers/topics, which a phone on a
 * different network cannot reach. Provenance and the measurements behind the
 * selection stay recorded in frontend/public/covers/README.md.
 */
interface TopicCover {
  /** Bundled picture, for the card. */
  readonly source: ImageSourcePropType;
  /** Colour standing for that picture, for the small mark. */
  readonly accent: string;
}

/**
 * Topic to picture, in the vocabulary's own order.
 *
 * `require` is spelled out per entry because Metro resolves asset paths at
 * build time: a path built from a variable bundles nothing.
 *
 * The order decides what a group carrying several topics is seen as — see
 * {@link topicCoverFor}.
 */
const TOPIC_COVERS: Readonly<Record<string, TopicCover>> = {
  PROGRAMMING: { source: require('../../../assets/covers/topics/topic-programming.jpg'), accent: '#4b8edd' },
  DATABASE: { source: require('../../../assets/covers/topics/topic-database.jpg'), accent: '#6b7280' },
  NETWORK_SYSTEMS: { source: require('../../../assets/covers/topics/topic-network-systems.jpg'), accent: '#4b6cdd' },
  INFORMATION_SECURITY: { source: require('../../../assets/covers/topics/topic-information-security.jpg'), accent: '#ddac4b' },
  DATA_SCIENCE: { source: require('../../../assets/covers/topics/topic-data-science.jpg'), accent: '#4e4bdd' },
  ARTIFICIAL_INTELLIGENCE: { source: require('../../../assets/covers/topics/topic-artificial-intelligence.jpg'), accent: '#714bdd' },
  DESIGN: { source: require('../../../assets/covers/topics/topic-design.jpg'), accent: '#4bb1dd' },
  BUSINESS: { source: require('../../../assets/covers/topics/topic-business.jpg'), accent: '#8b8178' },
  ENTREPRENEURSHIP: { source: require('../../../assets/covers/topics/topic-entrepreneurship.jpg'), accent: '#4bdd9a' },
  PROJECT_MANAGEMENT: { source: require('../../../assets/covers/topics/topic-project-management.jpg'), accent: '#4bd4dd' },
  LEADERSHIP: { source: require('../../../assets/covers/topics/topic-leadership.jpg'), accent: '#dd874b' },
  PRODUCTIVITY: { source: require('../../../assets/covers/topics/topic-productivity.jpg'), accent: '#4bddc4' },
  REGULATIONS: { source: require('../../../assets/covers/topics/topic-regulations.jpg'), accent: '#dd644b' },
  HEALTH: { source: require('../../../assets/covers/topics/topic-health.jpg'), accent: '#944bdd' },
  PSYCHOLOGY: { source: require('../../../assets/covers/topics/topic-psychology.jpg'), accent: '#dd4b55' },
  LANGUAGES: { source: require('../../../assets/covers/topics/topic-languages.jpg'), accent: '#ddd04b' },
  ARTS_CULTURE: { source: require('../../../assets/covers/topics/topic-arts-culture.jpg'), accent: '#dd4b78' },
  HISTORY_SOCIETY: { source: require('../../../assets/covers/topics/topic-history-society.jpg'), accent: '#c7dd4b' },
  RESEARCH: { source: require('../../../assets/covers/topics/topic-research.jpg'), accent: '#b84bdd' },
  OTHER: { source: require('../../../assets/covers/topics/topic-other.jpg'), accent: '#4bdd77' },
};

/** Declaration order, read once: the tie-break for a group with several topics. */
const TOPIC_ORDER: readonly string[] = Object.keys(TOPIC_COVERS);

/**
 * The picture for what a group is about, or null where that is unknown.
 *
 * Returning null rather than a default is the point: the caller falls back to
 * the id-hashed abstract set, which stays the answer for the groups created
 * before topics existed and for the ones whose owner skipped the picker.
 *
 * A group may carry up to three topics, and the API does not promise an order
 * for them. Picking the first element of the array would let a card change
 * picture because a row came back in a different order; the earliest topic in
 * the vocabulary is the same answer every time.
 *
 * Unknown values are ignored rather than thrown on, so a phone running an
 * older build falls back to an abstract cover instead of crashing the list
 * the first time the vocabulary grows.
 *
 * @param topics the group's topics, as the API sent them
 * @returns the picture and accent, or null where no topic is known here
 */
export function topicCoverFor(
  topics: readonly string[] | undefined,
): CoverIdentity | null {
  if (!topics?.length) {
    return null;
  }

  const known = topics
    .map((topic) => topic.toUpperCase())
    .filter((topic) => topic in TOPIC_COVERS);
  if (known.length === 0) {
    return null;
  }

  const chosen = known.reduce((best, topic) =>
    TOPIC_ORDER.indexOf(topic) < TOPIC_ORDER.indexOf(best) ? topic : best,
  );
  const cover = TOPIC_COVERS[chosen]!;
  return { source: cover.source, accent: cover.accent };
}

/** How many there are, for tests that assert the mapping covers the vocabulary. */
export const TOPIC_COVER_COUNT = TOPIC_ORDER.length;
