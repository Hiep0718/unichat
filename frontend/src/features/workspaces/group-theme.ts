/**
 * The one place that decides what colour a group is.
 *
 * A group has to look the same everywhere it appears — its card, its mark in
 * the left rail, the banner on its own page. Before this module the card
 * hashed the workspace id while the rail's letter avatar hashed the name, so
 * the same group was violet in one place and pink in another.
 *
 * Themes travel across two hues rather than shading one; that hue movement is
 * what separates a gradient that looks current from one that looks like a 2015
 * page header. The last stop is always a deep 800/900-level tint, never black,
 * because white text sits on it.
 *
 * There are twelve rather than six because colour is only useful as identity
 * while neighbouring groups differ: with six themes, someone in six groups
 * would expect about two pairs to collide, and two groups the same colour is
 * worse than none being coloured at all.
 */

export interface GroupTheme {
  /** Brightest stop, where the gradient starts. */
  readonly from: string;
  /** Mid stop, a different hue from {@link from}. */
  readonly via: string;
  /** Deep anchor at the end, dark enough to carry white text. */
  readonly to: string;
  /** Overlapping blob colours that give a large panel depth. */
  readonly blobA: string;
  readonly blobB: string;
}

const THEMES: readonly GroupTheme[] = [
  {
    // Violet → fuchsia
    from: '#8b5cf6', via: '#d946ef', to: '#4c1d95',
    blobA: 'rgb(240 171 252 / 62%)', blobB: 'rgb(34 211 238 / 38%)',
  },
  {
    // Cyan → blue
    from: '#22d3ee', via: '#3b82f6', to: '#1e3a8a',
    blobA: 'rgb(165 243 252 / 58%)', blobB: 'rgb(167 139 250 / 40%)',
  },
  {
    // Coral: rose → orange
    from: '#fb7185', via: '#f97316', to: '#881337',
    blobA: 'rgb(253 230 138 / 58%)', blobB: 'rgb(244 114 182 / 42%)',
  },
  {
    // Emerald → cyan
    from: '#34d399', via: '#06b6d4', to: '#065f46',
    blobA: 'rgb(190 242 100 / 48%)', blobB: 'rgb(103 232 249 / 44%)',
  },
  {
    // Electric: blue → violet
    from: '#3b82f6', via: '#8b5cf6', to: '#312e81',
    blobA: 'rgb(147 197 253 / 58%)', blobB: 'rgb(232 121 249 / 40%)',
  },
  {
    // Sunset: amber → pink
    from: '#fbbf24', via: '#ec4899', to: '#701a75',
    blobA: 'rgb(254 215 170 / 58%)', blobB: 'rgb(192 132 252 / 42%)',
  },
  {
    // Lime → emerald
    from: '#a3e635', via: '#10b981', to: '#14532d',
    blobA: 'rgb(217 249 157 / 54%)', blobB: 'rgb(94 234 212 / 42%)',
  },
  {
    // Sky → indigo
    from: '#38bdf8', via: '#6366f1', to: '#1e1b4b',
    blobA: 'rgb(186 230 253 / 56%)', blobB: 'rgb(216 180 254 / 40%)',
  },
  {
    // Pink → violet
    from: '#f472b6', via: '#a855f7', to: '#581c87',
    blobA: 'rgb(251 207 232 / 56%)', blobB: 'rgb(125 211 252 / 38%)',
  },
  {
    // Teal → blue
    from: '#2dd4bf', via: '#2563eb', to: '#134e4a',
    blobA: 'rgb(153 246 228 / 54%)', blobB: 'rgb(165 180 252 / 42%)',
  },
  {
    // Ember: red → amber
    from: '#f87171', via: '#f59e0b', to: '#7f1d1d',
    blobA: 'rgb(254 240 138 / 56%)', blobB: 'rgb(252 165 165 / 44%)',
  },
  {
    // Iris: indigo → cyan
    from: '#818cf8', via: '#22d3ee', to: '#1e3a8a',
    blobA: 'rgb(199 210 254 / 56%)', blobB: 'rgb(103 232 249 / 42%)',
  },
];

/**
 * Picks a group's theme.
 *
 * Hashed from the workspace id, not the name, so renaming a group does not
 * restyle it and the same group is the same colour on every screen.
 */
export function groupThemeFor(workspaceId: string): GroupTheme {
  let hash = 0;
  for (let i = 0; i < workspaceId.length; i += 1) {
    hash = (hash * 31 + workspaceId.charCodeAt(i)) % 1000003;
  }
  return THEMES[hash % THEMES.length] ?? THEMES[0]!;
}

/** Full-bleed background for a card or banner. */
export function coverBackground(theme: GroupTheme): string {
  return `linear-gradient(155deg, ${theme.from} 0%, ${theme.via} 48%, ${theme.to} 100%)`;
}

/** Overlapping blobs layered over {@link coverBackground} for depth. */
export function coverMesh(theme: GroupTheme): string {
  return (
    `radial-gradient(56% 56% at 84% 10%, ${theme.blobA}, transparent 70%),`
    + `radial-gradient(52% 52% at 8% 42%, ${theme.blobB}, transparent 72%)`
  );
}

/**
 * Background for a small mark, such as the rail's group tiles.
 *
 * Two stops rather than three plus a mesh: at 24px the deep anchor and the
 * blobs only muddy it, and the point of the mark is that the hue is
 * recognisable at a glance.
 */
export function markBackground(theme: GroupTheme): string {
  return `linear-gradient(145deg, ${theme.from} 0%, ${theme.via} 100%)`;
}
