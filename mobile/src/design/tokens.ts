/**
 * Bộ token thiết kế của UniChat trên di động.
 *
 * Đồng bộ với frontend/src/styles/index.css. Chú thích cũ ở đây nói chúng
 * được "mirrored 1:1" từ web, nhưng điều đó đã không còn đúng từ lâu: web
 * đã đổi từ teal sang xanh cornflower, nền từ ấm sang lạnh, và thêm cả chế
 * độ tối. Những giá trị dưới đây được kéo sang cho khớp lại.
 *
 * React Native không có custom property, nên đây là bản sao chứ không phải
 * một tham chiếu: mỗi lần web đổi màu thì file này phải đổi theo bằng tay.
 */

export const colors = {
  // Primary (Academic Navy)
  primary: '#045CDF',
  onPrimary: '#FFFFFF',
  primaryContainer: '#1F4FD0',
  onPrimaryContainer: '#E5EEFB',
  inversePrimary: '#5A9BFC',
  primaryFixed: '#E5EEFB',
  onPrimaryFixed: '#0A1A3C',

  // Secondary (AI Teal Accent)
  secondary: '#00687A',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#57DFFE',
  onSecondaryContainer: '#006172',
  secondaryFixed: '#ACEDFF',

  // Tertiary (Warm Amber)
  tertiary: '#4B1C00',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#6E2C00',
  onTertiaryContainer: '#F39461',

  // Surface & Background
  surface: '#F6F7F9',
  surfaceDim: '#E3E6EB',
  surfaceBright: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#FAFBFC',
  surfaceContainer: '#F1F3F6',
  surfaceContainerHigh: '#EEF0F3',
  surfaceContainerHighest: '#E3E6EB',
  onSurface: '#151A23',
  onSurfaceVariant: '#555C68',
  inverseSurface: '#242A34',
  inverseOnSurface: '#E9EDF3',

  // Outlines & Borders
  outline: '#9BA3B1',
  outlineVariant: '#D4D8E0',

  // Functional & State
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',
  success: '#10B981',
  warning: '#F59E0B',
  aiBubble: '#ECFEFF',
  aiBubbleBorder: '#A5F3FC',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 28,
  full: 9999,
} as const;

export const glass = {
  surface: 'rgba(255, 255, 255, 0.78)',
  surfaceHeavy: 'rgba(255, 255, 255, 0.88)',
  surfaceLight: 'rgba(255, 255, 255, 0.55)',
  surfaceUltraLight: 'rgba(255, 255, 255, 0.35)',
  surfaceNavy: 'rgba(0, 35, 111, 0.92)',
  surfaceTeal: 'rgba(0, 104, 122, 0.88)',
  border: 'rgba(255, 255, 255, 0.85)',
  borderSubtle: 'rgba(226, 232, 248, 0.65)',
  borderAccent: 'rgba(144, 168, 255, 0.35)',
  borderNavy: 'rgba(182, 196, 255, 0.28)',
  highlight: 'rgba(255, 255, 255, 0.95)',
  highlightShimmer: 'rgba(255, 255, 255, 0.6)',
  innerGlow: 'rgba(87, 223, 254, 0.12)',
  refractionStart: 'rgba(255, 255, 255, 0.4)',
  refractionEnd: 'rgba(255, 255, 255, 0.0)',
  ambientNavy: '#00236F',
  ambientTeal: '#00687A',
  ambientCyan: '#57DFFE',
  ambientViolet: 'rgba(144, 168, 255, 0.25)',
} as const;

/**
 * Centralized animation configuration for liquid glass motion.
 * Spring configs tuned for native-feel physics on iOS/Android.
 */
export const animation = {
  /** Smooth settling — cards, capsules, layout shifts */
  springSmooth: { damping: 22, stiffness: 180, mass: 0.9 },
  /** Bouncy tactile — buttons, tab icons, micro-interactions */
  springBouncy: { damping: 14, stiffness: 200, mass: 0.7 },
  /** Snappy precise — sliding indicators, focus transitions */
  springSnappy: { damping: 28, stiffness: 350, mass: 0.6 },
  /** Durations in ms */
  durationFast: 150,
  durationMedium: 280,
  durationSlow: 450,
  /** Stagger delay per item for list entrance animations */
  staggerDelay: 60,
} as const;

/**
 * Workplace surfaces — mirrored from the --ws-* block in
 * frontend/src/styles/index.css.
 *
 * Cards separate by elevation, not by a 1px outline: an interface whose every
 * box is drawn round reads as a wireframe. `accent` is the single saturated
 * colour and is spent on what the reader should act on, which is why a card
 * title stays `ink` here instead of taking the navy it used to have.
 */
export const workplace = {
  canvas: '#F3F5F9',
  card: '#FFFFFF',
  line: '#EEF2F7',
  chip: '#F1F5F9',

  ink: '#0F172A',
  inkSoft: '#475569',
  inkMuted: '#64748B',

  accent: '#1E3A8A',
  accentInk: '#FFFFFF',
  accentSoft: '#E6EBF7',

  okBg: '#DCFCE7',
  okInk: '#166534',
  warnBg: '#FEF3C7',
  warnInk: '#854D0E',
  alert: '#B91C1C',
} as const;

/**
 * Thanh điều hướng dạng dock tối, với nút Hỏi AI nổi ở giữa.
 *
 * `accent` cũng là màu bong bóng tin của mình trong màn Tin nhắn, để nút AI
 * và hành động chính của màn chat đọc như cùng một hệ.
 */
export const dock = {
  surface: '#0F172A',
  border: 'rgba(255, 255, 255, 0.06)',
  icon: '#94A3B8',
  iconActive: '#FFFFFF',
  accent: '#3346F5',
  accentPressed: '#2737D8',
  badge: '#EF4444',
} as const;

/** Màn Tin nhắn: nền, bong bóng và các viên thông tin trong luồng chat. */
export const messenger = {
  canvas: '#F4F5F9',
  card: '#FFFFFF',
  line: '#E8EBF2',
  mine: '#3346F5',
  mineInk: '#FFFFFF',
  theirs: '#FFFFFF',
  theirsInk: '#0F172A',
  chip: '#E8EBF2',
  chipInk: '#475569',
  field: '#EEF0F5',
  missedInk: '#DC2626',
  missedBorder: '#FBCFCF',
  missedIconBg: '#FEE2E2',
  okIconBg: '#DCFCE7',
  okIcon: '#16A34A',
  disabled: '#C7CCD8',
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiiToken = keyof typeof radii;
export type GlassToken = keyof typeof glass;
export type AnimationToken = keyof typeof animation;
export type WorkplaceToken = keyof typeof workplace;
