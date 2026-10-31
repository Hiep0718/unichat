/**
 * The pictures a group is seen by before anyone uploads one.
 *
 * Eight of them rather than one: the dashboard lists every group a member
 * belongs to, and a wall of identical cards is a wall nobody can navigate by
 * sight. They replace the derived gradient as the default, which was distinct
 * enough but read as a placeholder.
 *
 * Chosen to one rule — dark and close to abstract. A card writes its name,
 * visibility and counts over the picture in white, so a bright or busy photo
 * costs legibility, which matters more here than the photo does. The scrim in
 * {@link ./components/workspace-cover.css} is the second half of that
 * guarantee.
 *
 * Served as static files from /covers rather than imported, so the bundler
 * leaves them alone and the browser caches them across routes. Provenance and
 * licence are recorded in public/covers/README.md.
 */

/** A default picture, and the colour that stands for it where it does not fit. */
export interface DefaultCover {
  /** Filename under /covers. */
  readonly file: string;
  /**
   * Tile colour for {@link ./components/group-mark}, which is drawn too small
   * to show a photograph.
   *
   * Sampled from the picture, not invented: each file was decoded and its
   * pixels weighted by saturation and brightness, so the hue is the one the
   * eye takes from the card. The hues were then pulled at least 14 degrees
   * apart, because three of the pictures are blue-green within ten degrees of
   * each other and their tiles have to stay distinguishable in a rail.
   *
   * The five all-but-colourless pictures — rock, plaster, silk, onyx, slate —
   * have no hue to sample. They take neutrals of clearly different lightness
   * and temperature rather than a hue invented for them, which would promise
   * a colour their card does not have.
   */
  readonly accent: string;
}

/**
 * The pictures, ordered so neighbours differ.
 *
 * The assignment below walks this list when a group's first choice is taken,
 * and two adjacent near-blacks would hand two cards the same impression.
 */
const DEFAULT_COVERS: readonly DefaultCover[] = [
  { file: 'cover-ink.jpg', accent: '#cfd8e7' },
  { file: 'cover-magenta.jpg', accent: '#e7cfdf' },
  { file: 'cover-teal.jpg', accent: '#cfe7e3' },
  { file: 'cover-ember.jpg', accent: '#e7cfcf' },
  { file: 'cover-iris.jpg', accent: '#d2cfe7' },
  { file: 'cover-stone.jpg', accent: '#e7dbcf' },
  { file: 'cover-amber.jpg', accent: '#e7decf' },
  { file: 'cover-moss.jpg', accent: '#cfe7da' },
  { file: 'cover-slate.jpg', accent: '#cfd9e7' },
  { file: 'cover-orchid.jpg', accent: '#e6cfe7' },
  { file: 'cover-azure.jpg', accent: '#cfdee7' },
  { file: 'cover-onyx.jpg', accent: '#cfcfe7' },
  { file: 'cover-lilac.jpg', accent: '#dfcfe7' },
  { file: 'cover-silk.jpg', accent: '#cfdde7' },
  { file: 'cover-prism.jpg', accent: '#e7e3cf' },
  { file: 'cover-dawn.jpg', accent: '#cfd2e7' },
  { file: 'cover-copper.jpg', accent: '#e7d6cf' },
  { file: 'cover-ash.jpg', accent: '#cfd7e7' },
  { file: 'cover-violet.jpg', accent: '#d9cfe7' },
  { file: 'cover-nebula.jpg', accent: '#cfe3e7' },
];

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
  return { src: `/covers/${cover.file}`, accent: cover.accent };
}

/** How a group looks where it has not uploaded a picture of its own. */
export interface CoverIdentity {
  /** Path to the picture, for the card. */
  readonly src: string;
  /** Colour standing for that picture, for the small mark. */
  readonly accent: string;
}

/**
 * Picks a group's default picture.
 *
 * Hashed from the workspace id the same way {@link ./group-theme} hashes its
 * gradient, and for the same reasons: renaming a group does not restyle it,
 * and the same group looks the same on every screen and every device without
 * anything being stored.
 *
 * @param workspaceId the group's id
 * @returns the picture and the colour that stands for it
 */
export function defaultCoverFor(workspaceId: string): CoverIdentity {
  return coverAt(slotFor(workspaceId));
}

/**
 * Assigns every group in a list a picture no other group in it has.
 *
 * Hashing each id on its own cannot do this, however many pictures there are:
 * with ten groups and twenty pictures a repeat is still better than nine
 * chances in ten, and in practice two of the dashboard's cards looked
 * identical. So collisions are resolved across the list rather than wished
 * away — a group takes its hashed picture, or the next free one after it.
 *
 * Stable, and stored nowhere:
 *
 * - The ids are sorted first, so the answer does not depend on how the page
 *   happens to be sorted or filtered. The quick-access row and the grid below
 *   it show the same group the same way.
 * - Workspace ids are UUIDv7, which sort by creation time, so a new group is
 *   assigned last and never takes a picture off a group that already had one.
 * - Past {@link DEFAULT_COVER_COUNT} groups the pictures must repeat. The set
 *   is released and refilled, which keeps any run of that many consecutive
 *   groups free of repeats rather than letting the tail pile onto one picture.
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
