/**
 * Wrapper component for Material Symbols icons.
 * Provides type-safe icon rendering with consistent configuration.
 */

import type { CSSProperties } from 'react';

interface IconProps {
  /** Material Symbols icon name (e.g. 'school', 'search') */
  readonly name: string;
  /** Icon size in pixels */
  readonly size?: number;
  /** Whether to use filled variant */
  readonly filled?: boolean;
  /**
   * Material Symbols' friendlier family — soft terminals and a touch more
   * weight, in place of the default Outlined family's thin geometric line.
   * Opt-in per call site rather than a global switch: hundreds of icons
   * across the app use Outlined, and only a handful of screens asked for the
   * newer look. Both families share the same ligature names, so this never
   * changes which glyph is drawn.
   */
  readonly rounded?: boolean;
  /** Additional CSS class name */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
}

/**
 * Renders a Material Symbols icon span.
 */
export function Icon({
  name,
  size = 24,
  filled = false,
  rounded = false,
  className = '',
  style,
}: IconProps) {
  const weight = rounded ? 500 : 400;
  const iconStyle: CSSProperties = {
    fontSize: `${size}px`,
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
    ...style,
  };

  const baseClass = rounded ? 'material-symbols-rounded' : 'material-symbols-outlined';

  return (
    <span
      className={`${baseClass} ${className}`.trim()}
      style={iconStyle}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
