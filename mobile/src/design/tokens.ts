/**
 * UniChat Design System — Academic Precision.
 * Design tokens mirrored 1:1 from frontend/src/styles/index.css.
 */

export const colors = {
  // Primary (Academic Navy)
  primary: '#00236F',
  onPrimary: '#FFFFFF',
  primaryContainer: '#1E3A8A',
  onPrimaryContainer: '#90A8FF',
  inversePrimary: '#B6C4FF',
  primaryFixed: '#DCE1FF',
  onPrimaryFixed: '#00164E',

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
  surface: '#F9F9FF',
  surfaceDim: '#D3DAEA',
  surfaceBright: '#F9F9FF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F0F3FF',
  surfaceContainer: '#E7EEFE',
  surfaceContainerHigh: '#E2E8F8',
  surfaceContainerHighest: '#DCE2F3',
  onSurface: '#151C27',
  onSurfaceVariant: '#444651',
  inverseSurface: '#2A313D',
  inverseOnSurface: '#EBF1FF',

  // Outlines & Borders
  outline: '#757682',
  outlineVariant: '#C5C5D3',

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

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiiToken = keyof typeof radii;
export type GlassToken = keyof typeof glass;
export type AnimationToken = keyof typeof animation;
