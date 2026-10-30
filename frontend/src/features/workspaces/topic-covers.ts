/**
 * The picture a group gets for what it is about, rather than for its id.
 *
 * {@link ./default-covers} hands every group a dark abstract photograph drawn
 * from its id. That makes cards tellable apart, which is what it was for, but
 * it says nothing: a group on databases and a group on nutrition are a teal
 * smear and an amber smear. Once a group carries topics, the card can show
 * what it holds.
 *
 * One picture per topic in {@link WorkspaceTopic}, so the mapping is total and
 * a new topic in the vocabulary is a missing file here, not a silent fallback.
 *
 * Every picture had to clear the same bar the abstract set did — dark, quiet,
 * and legible under the white text a card writes over it. That bar is why
 * several obvious choices are not here: medical photography is almost
 * uniformly white, and the pictures that read most immediately as "a to-do
 * list" or "a project board" carry English words that collide with the card's
 * own. Each file was measured for mean luminance over its lower third, where
 * the card's text sits, and for spread, which flags a busy picture. Provenance
 * and the measurements are in public/covers/README.md.
 *
 * Served from /covers/topics as static files, like the abstract set, so the
 * bundler leaves them alone and the browser caches them across routes.
 */
import type { CoverIdentity } from './default-covers';

/** A topic's picture, and the colour that stands for it where it does not fit. */
interface TopicCover {
  /** Filename under /covers/topics. */
  readonly file: string;
  /**
   * Tile colour for a group mark, sampled from the picture rather than
   * invented: pixels weighted by saturation and lightness, so the hue is the
   * one the eye takes from the card rather than a flat average, which on a
   * dark photograph returns mud.
   *
   * The sampled hues were then pulled at least 14 degrees apart, the same
   * floor {@link ./default-covers} sets, because the technical topics are
   * photographed in blue almost without exception and seven near-identical
   * blue tiles are seven tiles nobody can navigate by.
   *
   * Two pictures — the server racks and the suit — have no hue to sample.
   * They take neutrals of different lightness and temperature rather than a
   * colour their card does not have.
   */
  readonly accent: string;
}

/**
 * Topic to picture, in the vocabulary's own order.
 *
 * The order is not decoration: {@link topicCoverFor} resolves a group carrying
 * several topics by taking the first one listed here, so this order decides
 * what a group on both databases and programming is seen as. It mirrors
 * `WorkspaceTopic` in the Core API, where technical subjects lead and the two
 * catch-alls trail.
 */
const TOPIC_COVERS: Readonly<Record<string, TopicCover>> = {
  PROGRAMMING: { file: 'topic-programming.jpg', accent: '#4b8edd' },
  DATABASE: { file: 'topic-database.jpg', accent: '#6b7280' },
  NETWORK_SYSTEMS: { file: 'topic-network-systems.jpg', accent: '#4b6cdd' },
  INFORMATION_SECURITY: { file: 'topic-information-security.jpg', accent: '#ddac4b' },
  DATA_SCIENCE: { file: 'topic-data-science.jpg', accent: '#4e4bdd' },
  ARTIFICIAL_INTELLIGENCE: { file: 'topic-artificial-intelligence.jpg', accent: '#714bdd' },
  DESIGN: { file: 'topic-design.jpg', accent: '#4bb1dd' },
  BUSINESS: { file: 'topic-business.jpg', accent: '#8b8178' },
  ENTREPRENEURSHIP: { file: 'topic-entrepreneurship.jpg', accent: '#4bdd9a' },
  PROJECT_MANAGEMENT: { file: 'topic-project-management.jpg', accent: '#4bd4dd' },
  LEADERSHIP: { file: 'topic-leadership.jpg', accent: '#dd874b' },
  PRODUCTIVITY: { file: 'topic-productivity.jpg', accent: '#4bddc4' },
  REGULATIONS: { file: 'topic-regulations.jpg', accent: '#dd644b' },
  HEALTH: { file: 'topic-health.jpg', accent: '#944bdd' },
  PSYCHOLOGY: { file: 'topic-psychology.jpg', accent: '#dd4b55' },
  LANGUAGES: { file: 'topic-languages.jpg', accent: '#ddd04b' },
  ARTS_CULTURE: { file: 'topic-arts-culture.jpg', accent: '#dd4b78' },
  HISTORY_SOCIETY: { file: 'topic-history-society.jpg', accent: '#c7dd4b' },
  RESEARCH: { file: 'topic-research.jpg', accent: '#b84bdd' },
  OTHER: { file: 'topic-other.jpg', accent: '#4bdd77' },
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
 * Unknown values are ignored rather than thrown on. The vocabulary is expected
 * to grow, and a client that has not shipped yet should fall back to an
 * abstract cover, not break the page.
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
  return { src: `/covers/topics/${cover.file}`, accent: cover.accent };
}

/** How many there are, for tests that assert the mapping covers the vocabulary. */
export const TOPIC_COVER_COUNT = TOPIC_ORDER.length;
