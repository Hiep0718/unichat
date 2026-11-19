/**
 * Keyboard movement inside a listbox, kept apart from the component so it can
 * be tested as plain arithmetic.
 */

/**
 * Returns the option index a navigation key moves to, or `null` when the key
 * does not move the highlight. Arrows stop at the ends rather than wrapping,
 * matching a native select.
 */
export function nextIndex(key: string, current: number, count: number): number | null {
  if (count === 0) return null;
  const last = count - 1;
  switch (key) {
    case 'ArrowDown':
      return Math.min(current + 1, last);
    case 'ArrowUp':
      return Math.max(current - 1, 0);
    case 'Home':
    case 'PageUp':
      return 0;
    case 'End':
    case 'PageDown':
      return last;
    default:
      return null;
  }
}
