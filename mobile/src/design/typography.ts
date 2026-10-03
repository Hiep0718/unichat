import { TextStyle } from 'react-native';

/**
 * Typography definitions for UniChat Mobile.
 * Fonts mapped to Inter font variants.
 */
export const typography = {
  headlineXl: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
  } as TextStyle,

  headlineLg: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
  } as TextStyle,

  headlineMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    lineHeight: 26,
  } as TextStyle,

  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  bodySm: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  labelMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  labelSm: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  codeSm: {
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,
} as const;
