import { describe, expect, it } from 'vitest';

import { DEFAULT_COVER_COUNT, assignCovers, defaultCoverFor } from './default-covers';

const IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
];

describe('defaultCoverFor', () => {
  it('should give the same group the same picture every time', () => {
    // Arrange and Act: the dashboard renders a group twice, in the
    // quick-access row and in the list below it.
    const first = defaultCoverFor(IDS[0]!).src;
    const second = defaultCoverFor(IDS[0]!).src;

    // Assert
    expect(first).toBe(second);
  });

  it('should spread groups across the whole set rather than favouring one', () => {
    // Arrange: a wall of identical cards is the problem being solved, so a
    // hash that lands most groups on one picture would not fix it.
    const chosen = new Set(IDS.map((id) => defaultCoverFor(id).src));

    // Assert
    expect(chosen.size).toBeGreaterThan(1);
  });

  it('should only ever name a file that is in the bundled set', () => {
    // Arrange and Act: an index off the end would render a broken image.
    const paths = IDS.map((id) => defaultCoverFor(id).src);

    // Assert
    for (const path of paths) {
      expect(path).toMatch(/^\/covers\/cover-[a-z]+\.jpg$/);
    }
  });

  it('should hold an id that hashes past the end of the set', () => {
    // Arrange: the modulo is what keeps a long id in range.
    const long = 'z'.repeat(400);

    // Act and Assert
    expect(defaultCoverFor(long).src).toMatch(/^\/covers\//);
  });

  it('should still answer for an empty id', () => {
    // Arrange: a card rendered before its group has loaded.
    expect(defaultCoverFor('').src).toMatch(/^\/covers\//);
  });

  it('should report how many pictures there are', () => {
    // Guards the count the tests above reason about.
    expect(DEFAULT_COVER_COUNT).toBe(20);
  });
});

describe('assignCovers', () => {
  /** The ten groups on the dashboard that showed the repeat. */
  const REAL_IDS = [
    '019f88b7-a7e6-70c0-ad22-c4edaa988e22',
    '019f88b8-99f5-7706-b8cc-cbd34c931093',
    '019fbb93-3b75-78dc-9215-85298ab8af9e',
    '019fcac3-e788-77bc-8804-b1f5b6c0f1e2',
    '019fda1b-a23b-77ed-a206-569e0dcaefdb',
    '019fef7a-588a-7056-b055-554ac2b10248',
    '019ff5e1-e531-73e3-a79c-b09f41fc41a5',
    '01a017f7-f724-7fc6-a579-08e9cf2f68a7',
    '01a079ca-ce20-768b-9714-6a2cd3fb58a0',
    '01a0c18c-e612-78b7-813f-0ea96819658d',
  ];

  it('should give every group on a page a picture of its own', () => {
    // Arrange: these are the real ids whose cards came out identical.
    // Hashing each one alone still collides here, with twenty pictures.
    const hashedAlone = new Set(REAL_IDS.map((id) => defaultCoverFor(id).src));
    expect(hashedAlone.size).toBeLessThan(REAL_IDS.length);

    // Act
    const assigned = assignCovers(REAL_IDS);

    // Assert
    expect(new Set([...assigned.values()].map((c) => c.src)).size)
      .toBe(REAL_IDS.length);
  });

  it('should not depend on the order the page happens to be sorted in', () => {
    // Arrange: the grid sorts by name, by created date or by updated date, and
    // the quick-access row takes the five most recent. All must agree.
    const sortedOneWay = assignCovers(REAL_IDS);
    const sortedAnother = assignCovers([...REAL_IDS].reverse());

    // Assert
    for (const id of REAL_IDS) {
      expect(sortedAnother.get(id)?.src).toBe(sortedOneWay.get(id)?.src);
    }
  });

  it('should keep a group on the same picture when a newer group appears', () => {
    // Arrange: workspace ids are UUIDv7, so a new group sorts last and is
    // assigned last. Creating one must not restyle everybody else's card.
    const before = assignCovers(REAL_IDS);

    // Act
    const after = assignCovers([...REAL_IDS, '01a0ffff-ffff-7fff-bfff-ffffffffffff']);

    // Assert
    for (const id of REAL_IDS) {
      expect(after.get(id)?.src).toBe(before.get(id)?.src);
    }
  });

  it('should answer for every group it was given', () => {
    // Arrange and Act
    const assigned = assignCovers(REAL_IDS);

    // Assert
    for (const id of REAL_IDS) {
      expect(assigned.get(id)?.src).toMatch(/^\/covers\/cover-[a-z]+\.jpg$/);
    }
  });

  it('should spread the repeats once there are more groups than pictures', () => {
    // Arrange: past twenty groups a picture has to come round again. It should
    // come round evenly rather than piling the tail onto one.
    const many = Array.from(
      { length: DEFAULT_COVER_COUNT * 2 },
      (_, i) => `01a0${String(i).padStart(4, '0')}-0000-7000-8000-000000000000`,
    );

    // Act
    const counts = new Map<string, number>();
    for (const { src } of assignCovers(many).values()) {
      counts.set(src, (counts.get(src) ?? 0) + 1);
    }

    // Assert: every picture used, none more than twice.
    expect(counts.size).toBe(DEFAULT_COVER_COUNT);
    expect(Math.max(...counts.values())).toBe(2);
  });

  it('should ignore a group listed twice rather than wasting a picture on it', () => {
    // Arrange: the same group appears in the quick-access row and the grid.
    const assigned = assignCovers([REAL_IDS[0]!, REAL_IDS[0]!, REAL_IDS[1]!]);

    // Assert
    expect(assigned.size).toBe(2);
  });

  it('should return nothing for an empty page', () => {
    expect(assignCovers([]).size).toBe(0);
  });
});

describe('the colour that stands in for a picture', () => {
  const REAL_IDS = [
    '019f88b7-a7e6-70c0-ad22-c4edaa988e22',
    '019f88b8-99f5-7706-b8cc-cbd34c931093',
    '019fbb93-3b75-78dc-9215-85298ab8af9e',
    '019fcac3-e788-77bc-8804-b1f5b6c0f1e2',
    '019fda1b-a23b-77ed-a206-569e0dcaefdb',
    '019fef7a-588a-7056-b055-554ac2b10248',
    '019ff5e1-e531-73e3-a79c-b09f41fc41a5',
    '01a017f7-f724-7fc6-a579-08e9cf2f68a7',
    '01a079ca-ce20-768b-9714-6a2cd3fb58a0',
    '01a0c18c-e612-78b7-813f-0ea96819658d',
  ];

  it('should give the rail a different tile for every group', () => {
    // Arrange and Act: two of these ten drew the same orange tile.
    const accents = [...assignCovers(REAL_IDS).values()].map((c) => c.accent);

    // Assert
    expect(new Set(accents).size).toBe(REAL_IDS.length);
  });

  it('should pair one colour with one picture, so the rail names the card', () => {
    // Arrange: a tile is only a legend for a card if the pairing is fixed.
    const seen = new Map<string, string>();

    // Act
    for (const { src, accent } of assignCovers(
      Array.from({ length: DEFAULT_COVER_COUNT }, (_, i) =>
        `01a0${String(i).padStart(4, '0')}-0000-7000-8000-000000000000`),
    ).values()) {
      // Assert
      expect(seen.get(accent) ?? src).toBe(src);
      seen.set(accent, src);
    }
    expect(seen.size).toBe(DEFAULT_COVER_COUNT);
  });

  it('should state every colour as a hex value the style attribute accepts', () => {
    for (const id of REAL_IDS) {
      expect(assignCovers(REAL_IDS).get(id)?.accent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
