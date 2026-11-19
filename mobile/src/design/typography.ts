import { TextStyle } from 'react-native';

/**
 * Tên mặt chữ đã nạp ở `app/_layout.tsx`.
 *
 * Mọi màn hình lấy tên font từ đây thay vì viết chuỗi `'Inter_700Bold'`
 * trực tiếp, để khi mobile chuyển sang IBM Plex Sans như web thì chỉ phải
 * đổi đúng bảng này.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

/**
 * Typography definitions for UniChat Mobile.
 *
 * `pageTitle` là `--font-page-title` của web (24px, đậm 700): mọi tiêu đề
 * trang cấp một dùng nó, để chuyển tab không thấy tiêu đề đổi cỡ.
 */
export const typography = {
  pageTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.24,
  } as TextStyle,

  headlineXl: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
  } as TextStyle,

  headlineLg: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
  } as TextStyle,

  headlineMd: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 26,
  } as TextStyle,

  bodyLg: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  bodyMd: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  bodySm: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  labelMd: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  labelSm: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  codeSm: {
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  headlineHero: {
    fontFamily: fonts.extrabold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.7,
  } as TextStyle,
} as const;
