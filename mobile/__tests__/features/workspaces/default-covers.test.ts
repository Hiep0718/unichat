import {
  defaultCoverFor,
  assignCovers,
  DEFAULT_COVER_COUNT,
} from '../../../src/features/workspaces/default-covers';

describe('defaultCoverFor', () => {
  it('should carry the same twenty pictures the web does', async () => {
    expect(DEFAULT_COVER_COUNT).toBe(20);
  });

  it('should hash a group to the same slot the web hashes it to', async () => {
    // The anchors are the whole point of the port: these ids were run through
    // the web's own slotFor, so a drift in the hash, the list or its order
    // fails here rather than showing a member a different group colour on
    // their phone than on their laptop.
    expect(defaultCoverFor('0193a1f0-aaaa-7000-8000-00000000000a').accent).toBe('#d9cfe7');
    expect(defaultCoverFor('0193a1f0-dddd-7000-8000-00000000000d').accent).toBe('#e7dbcf');
    expect(defaultCoverFor('0193a1f0-ffff-7000-8000-00000000000f').accent).toBe('#cfe7e3');
  });

  it('should give a group the same picture every time it is asked', async () => {
    const first = defaultCoverFor('group-abc');
    const second = defaultCoverFor('group-abc');

    expect(second.accent).toBe(first.accent);
    expect(second.source).toBe(first.source);
  });

  it('should bundle the picture rather than point at a web path', async () => {
    // On the web `src` is '/covers/x.jpg'. A phone on another network cannot
    // fetch that, so Metro resolves the file into the app instead.
    expect(typeof defaultCoverFor('group-abc').source).not.toBe('string');
  });
});

describe('assignCovers', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `ws-${i}`);

  it('should give no two groups in a list the same picture', async () => {
    // Hashing each id alone cannot promise this: with ten groups and twenty
    // pictures a repeat is still likelier than not, and two identical cards
    // is what sent the web looking for this algorithm.
    const assigned = assignCovers(ids(DEFAULT_COVER_COUNT));
    const accents = [...assigned.values()].map((cover) => cover.accent);

    expect(new Set(accents).size).toBe(DEFAULT_COVER_COUNT);
  });

  it('should not depend on the order the list arrives in', async () => {
    const forward = assignCovers(ids(12));
    const reversed = assignCovers([...ids(12)].reverse());

    for (const id of ids(12)) {
      expect(reversed.get(id)!.accent).toBe(forward.get(id)!.accent);
    }
  });

  it('should refill the set rather than pile the tail onto one picture', async () => {
    const assigned = assignCovers(ids(DEFAULT_COVER_COUNT + 6));
    const accents = [...assigned.values()].map((cover) => cover.accent);
    const counts = new Map<string, number>();

    for (const accent of accents) {
      counts.set(accent, (counts.get(accent) ?? 0) + 1);
    }

    expect(assigned.size).toBe(DEFAULT_COVER_COUNT + 6);
    expect(Math.max(...counts.values())).toBe(2);
  });

  it('should ignore a repeated id rather than assign it twice', async () => {
    expect(assignCovers(['ws-1', 'ws-1', 'ws-2']).size).toBe(2);
  });
});
