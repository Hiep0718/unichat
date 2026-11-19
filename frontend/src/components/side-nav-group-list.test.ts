import { describe, expect, it } from 'vitest';

import { withActiveGroup } from './side-nav-group-list';

describe('withActiveGroup', () => {
  const loaded = [
    { id: 'a', name: 'Nhóm A' },
    { id: 'b', name: 'Nhóm B' },
  ];

  it('adds the open group when it is not among the loaded ones, so it can be marked', () => {
    // Act
    const groups = withActiveGroup(loaded, { id: 'z', name: 'Nhóm Z' });

    // Assert
    expect(groups.map((group) => group.id)).toEqual(['z', 'a', 'b']);
  });

  it('keeps the list as it is when the open group is already there or none is open', () => {
    // Act and Assert
    expect(withActiveGroup(loaded, { id: 'b', name: 'Nhóm B' })).toBe(loaded);
    expect(withActiveGroup(loaded, null)).toBe(loaded);
  });
});
