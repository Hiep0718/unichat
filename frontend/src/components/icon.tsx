/**
 * Wrapper component for Material Symbols Outlined icons.
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
  /** Additional CSS class name */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
}

/**
 * Renders a Material Symbols Outlined icon span.
 */
export function Icon({
  name,
  size = 24,
  filled = false,
  className = '',
  style,
}: IconProps) {
  const iconStyle: CSSProperties = {
    fontSize: `${size}px`,
    fontVariationSettings: filled
      ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
      : undefined,
    ...style,
  };

  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={iconStyle}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
