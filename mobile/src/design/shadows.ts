import { ViewStyle } from 'react-native';

import { palette } from './tokens';

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
    shadowColor: palette.rayNen,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 10,
  } as ViewStyle,

  glass: {
    shadowColor: palette.rayNen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  } as ViewStyle,

  glassFloating: {
    shadowColor: palette.rayNen,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
  } as ViewStyle,

  glassGlow: {
    shadowColor: palette.rayNhan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  } as ViewStyle,

  /**
   * Thẻ nằm yên: `--ws-card-shadow` của web, tức `0 0 0 1px var(--vien)`.
   * Web bỏ bóng đổ ở trạng thái nghỉ và tách thẻ bằng một nét viền, nên ở
   * đây cũng là viền chứ không phải bóng. Chỉ hộp thoại nổi thật mới có bóng.
   */
  card: {
    borderWidth: 1,
    borderColor: palette.vien,
  } as ViewStyle,

  /** Colored ambient glow shadows for liquid glass depth */
  ambientNavy: {
    shadowColor: palette.rayNen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,

  ambientTeal: {
    shadowColor: palette.nhan,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  } as ViewStyle,

  ambientCyan: {
    shadowColor: palette.rayNhan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 6,
  } as ViewStyle,
} as const;
