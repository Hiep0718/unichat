import { describe, expect, it } from 'vitest';

import { allowsMembers, VISIBILITY_OPTIONS, visibilityOption } from './workspace-visibility';

describe('workspace visibility levels', () => {
  it('should order the levels from most closed to most open', () => {
    expect(VISIBILITY_OPTIONS.map((option) => option.value)).toEqual([
      'PRIVATE',
      'SHARED',
      'PUBLIC',
    ]);
  });

  it('should describe each level exactly once', () => {
    const descriptions = VISIBILITY_OPTIONS.map((option) => option.description);

    // Four screens once carried four different descriptions of the same two
    // levels, which is what this module exists to prevent.
    expect(new Set(descriptions).size).toBe(VISIBILITY_OPTIONS.length);
  });

  it('should allow members on every level but private', () => {
    expect(allowsMembers('PRIVATE')).toBe(false);
    expect(allowsMembers('SHARED')).toBe(true);
    expect(allowsMembers('PUBLIC')).toBe(true);
  });

  it('should fall back to the most closed reading for an unknown level', () => {
    // A level this build does not know must not render as "Công khai".
    const unknown = 'RESTRICTED' as never;

    expect(visibilityOption(unknown).value).toBe('PRIVATE');
  });
});
