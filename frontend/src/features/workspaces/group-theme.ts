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
    from: '#322c3f', via: '#322c3f', to: '#262131',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Cyan → blue
    from: '#2c3d3f', via: '#2c3d3f', to: '#212f31',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Coral: rose → orange
    from: '#3f2c2f', via: '#3f2c2f', to: '#312123',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Emerald → cyan
    from: '#2c3f38', via: '#2c3f38', to: '#21312b',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Electric: blue → violet
    from: '#2c333f', via: '#2c333f', to: '#212731',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Sunset: amber → pink
    from: '#3f3a2c', via: '#3f3a2c', to: '#312c21',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Lime → emerald
    from: '#383f2c', via: '#383f2c', to: '#2b3121',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Sky → indigo
    from: '#2c393f', via: '#2c393f', to: '#212c31',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Pink → violet
    from: '#3f2c36', via: '#3f2c36', to: '#312129',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Teal → blue
    from: '#2c3f3d', via: '#2c3f3d', to: '#21312f',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Ember: red → amber
    from: '#3f2c2c', via: '#3f2c2c', to: '#312121',
    blobA: 'transparent', blobB: 'transparent',
  },
  {
    // Iris: indigo → cyan
    from: '#2c2e3f', via: '#2c2e3f', to: '#212231',
    blobA: 'transparent', blobB: 'transparent',
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
  // Một tông trầm, không phải một dải. Đây là thứ sơn trong khoảnh khắc ảnh
  // chưa giải mã xong, và là thứ còn lại nếu ảnh không tải được — không phải
  // một lớp trang trí.
  return theme.to;
}

/**
 * Giữ lại cho các nơi gọi cũ, và cố ý trả về rỗng.
 *
 * Trước đây đây là hai vệt radial chồng lên nhau để tạo chiều sâu cho mảng
 * nền. Giờ mảng nền nằm sau một bức ảnh thật, nên chiều sâu đã có sẵn trong
 * ảnh; thêm vệt vào chỉ là trang trí trên thứ không ai nhìn thấy.
 */
export function coverMesh(_theme: GroupTheme): string {
  return 'none';
}
