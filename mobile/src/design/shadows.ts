import { ViewStyle } from 'react-native';

/**
 * Elevation shadows for mobile design tokens.
 */
export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  } as ViewStyle,

  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  } as ViewStyle,

  xl: {
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 10,
  } as ViewStyle,

  glass: {
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  } as ViewStyle,

  glassFloating: {
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
  } as ViewStyle,

  glassGlow: {
    shadowColor: '#57DFFE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  } as ViewStyle,

  /** Colored ambient glow shadows for liquid glass depth */
  ambientNavy: {
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,

  ambientTeal: {
    shadowColor: '#00687A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  } as ViewStyle,

  ambientCyan: {
    shadowColor: '#57DFFE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 6,
  } as ViewStyle,
} as const;
