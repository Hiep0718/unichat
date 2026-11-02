import type { ImageSourcePropType } from 'react-native';

/**
 * The pictures a group is seen by before anyone uploads one.
 *
 * Ported from frontend/src/features/workspaces/default-covers.ts, keeping the
 * list, its order, the accents and the hash byte for byte. That is the point
 * of the port: a group hashes to the same slot on both clients, so the group
 * a member knows as the teal one is teal in the browser and teal on a phone.
 *
 * The pictures are bundled rather than fetched. The web serves them from
 * /covers, which a phone on a different network cannot reach, and a card
 * whose picture depends on the dev server is a card that is blank half the
 * time. Provenance and licence stay recorded in
 * frontend/public/covers/README.md.
 */
export interface DefaultCover {
  /** Bundled picture, for the card. */
  readonly source: ImageSourcePropType;
  /** Colour standing for that picture, for the small mark. */
  readonly accent: string;
}

/**
 * The pictures, ordered so neighbours differ.
 *
 * `require` is spelled out per entry because Metro resolves asset paths at
 * build time: a path built from a variable bundles nothing.
 */
const DEFAULT_COVERS: readonly DefaultCover[] = [
  { source: require('../../../assets/covers/cover-ink.jpg'), accent: '#cfd8e7' },
  { source: require('../../../assets/covers/cover-magenta.jpg'), accent: '#e7cfdf' },
  { source: require('../../../assets/covers/cover-teal.jpg'), accent: '#cfe7e3' },
  { source: require('../../../assets/covers/cover-ember.jpg'), accent: '#e7cfcf' },
  { source: require('../../../assets/covers/cover-iris.jpg'), accent: '#d2cfe7' },
  { source: require('../../../assets/covers/cover-stone.jpg'), accent: '#e7dbcf' },
  { source: require('../../../assets/covers/cover-amber.jpg'), accent: '#e7decf' },
  { source: require('../../../assets/covers/cover-moss.jpg'), accent: '#cfe7da' },
  { source: require('../../../assets/covers/cover-slate.jpg'), accent: '#cfd9e7' },
  { source: require('../../../assets/covers/cover-orchid.jpg'), accent: '#e6cfe7' },
  { source: require('../../../assets/covers/cover-azure.jpg'), accent: '#cfdee7' },
  { source: require('../../../assets/covers/cover-onyx.jpg'), accent: '#cfcfe7' },
  { source: require('../../../assets/covers/cover-lilac.jpg'), accent: '#dfcfe7' },
  { source: require('../../../assets/covers/cover-silk.jpg'), accent: '#cfdde7' },
  { source: require('../../../assets/covers/cover-prism.jpg'), accent: '#e7e3cf' },
  { source: require('../../../assets/covers/cover-dawn.jpg'), accent: '#cfd2e7' },
  { source: require('../../../assets/covers/cover-copper.jpg'), accent: '#e7d6cf' },
  { source: require('../../../assets/covers/cover-ash.jpg'), accent: '#cfd7e7' },
  { source: require('../../../assets/covers/cover-violet.jpg'), accent: '#d9cfe7' },
  { source: require('../../../assets/covers/cover-nebula.jpg'), accent: '#cfe3e7' },
];

/** How a group looks where it has not uploaded a picture of its own. */
export interface CoverIdentity {
  readonly source: ImageSourcePropType;
  readonly accent: string;
}

/** Where a workspace id lands before collisions are resolved. */
function slotFor(workspaceId: string): number {
  let hash = 0;
  for (let i = 0; i < workspaceId.length; i += 1) {
    hash = (hash * 31 + workspaceId.charCodeAt(i)) % 1000003;
  }
  return hash % DEFAULT_COVERS.length;
}

function coverAt(slot: number): CoverIdentity {
  const cover = DEFAULT_COVERS[slot] ?? DEFAULT_COVERS[0]!;
  return { source: cover.source, accent: cover.accent };
}

/**
 * Picks a group's default picture.
 *
 * Hashed from the workspace id, so renaming a group does not restyle it and
 * the same group looks the same on every screen without anything being
 * stored.
 */
export function defaultCoverFor(workspaceId: string): CoverIdentity {
  return coverAt(slotFor(workspaceId));
}

/**
 * Assigns every group in a list a picture no other group in it has.
 *
 * Hashing each id on its own cannot do this, however many pictures there are:
 * with ten groups and twenty pictures a repeat is still better than nine
 * chances in ten. So collisions are resolved across the list — a group takes
 * its hashed picture, or the next free one after it. The ids are sorted
 * first so the answer does not depend on how the list happens to be ordered,
 * and past DEFAULT_COVER_COUNT groups the set is released and refilled.
 *
 * @param workspaceIds every group being shown, not only the visible page
 */
export function assignCovers(
  workspaceIds: readonly string[],
): ReadonlyMap<string, CoverIdentity> {
  const assigned = new Map<string, CoverIdentity>();
  const taken = new Set<number>();

  for (const id of [...new Set(workspaceIds)].sort()) {
    if (taken.size === DEFAULT_COVERS.length) {
      taken.clear();
    }
    let slot = slotFor(id);
    while (taken.has(slot)) {
      slot = (slot + 1) % DEFAULT_COVERS.length;
    }
    taken.add(slot);
    assigned.set(id, coverAt(slot));
  }

  return assigned;
}

/** How many there are, for tests that assert the spread across groups. */
export const DEFAULT_COVER_COUNT = DEFAULT_COVERS.length;
