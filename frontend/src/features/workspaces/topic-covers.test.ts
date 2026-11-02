import { describe, expect, it } from 'vitest';

import { TOPIC_COVER_COUNT, topicCoverFor } from './topic-covers';

/**
 * The Core API's WorkspaceTopic vocabulary, in its own declaration order.
 *
 * Repeated here rather than imported because there is nothing to import from:
 * the enum lives in Java. A topic added there and not here fails the first
 * test below, which is the point — a group would otherwise silently fall back
 * to an abstract cover with nobody noticing.
 */
const VOCABULARY = [
  'PROGRAMMING',
  'DATABASE',
  'NETWORK_SYSTEMS',
  'INFORMATION_SECURITY',
  'DATA_SCIENCE',
  'ARTIFICIAL_INTELLIGENCE',
  'DESIGN',
  'BUSINESS',
  'ENTREPRENEURSHIP',
  'PROJECT_MANAGEMENT',
  'LEADERSHIP',
  'PRODUCTIVITY',
  'REGULATIONS',
  'HEALTH',
  'PSYCHOLOGY',
  'LANGUAGES',
  'ARTS_CULTURE',
  'HISTORY_SOCIETY',
  'RESEARCH',
  'OTHER',
] as const;

describe('topicCoverFor', () => {
  it('should give every topic in the vocabulary a picture of its own', () => {
    expect(TOPIC_COVER_COUNT).toBe(VOCABULARY.length);

    const files = VOCABULARY.map((topic) => topicCoverFor([topic])?.src);
    expect(files.every(Boolean)).toBe(true);
    expect(new Set(files).size).toBe(VOCABULARY.length);
  });

  it('should point at files that are actually there', () => {
    // Globbed rather than read through node:fs: this suite is compiled by the
    // app's own tsconfig, which carries no Node types. A name that does not
    // match a file would otherwise only show up as a 404 in a browser.
    const onDisk = Object.keys(import.meta.glob('../../../public/covers/topics/*.jpg'));
    expect(onDisk).toHaveLength(VOCABULARY.length);

    for (const topic of VOCABULARY) {
      const src = topicCoverFor([topic])!.src;
      expect(onDisk.some((path) => path.endsWith(src))).toBe(true);
    }
  });

  it('should fall back for a group that carries no topic', () => {
    expect(topicCoverFor(undefined)).toBeNull();
    expect(topicCoverFor([])).toBeNull();
  });

  it('should fall back rather than break when the vocabulary has grown past this build', () => {
    expect(topicCoverFor(['QUANTUM_BASKET_WEAVING'])).toBeNull();
  });

  it('should ignore an unknown topic when a known one sits beside it', () => {
    expect(topicCoverFor(['QUANTUM_BASKET_WEAVING', 'DATABASE'])?.src).toBe(
      topicCoverFor(['DATABASE'])?.src,
    );
  });

  it('should pick the same picture however the API ordered the topics', () => {
    // A group on both subjects must not change picture because the rows came
    // back the other way round.
    const forward = topicCoverFor(['PROGRAMMING', 'DATABASE']);
    const reversed = topicCoverFor(['DATABASE', 'PROGRAMMING']);

    expect(forward?.src).toBe(reversed?.src);
    expect(forward?.src).toBe(topicCoverFor(['PROGRAMMING'])?.src);
  });

  it('should read a topic whatever case it arrives in', () => {
    expect(topicCoverFor(['database'])?.src).toBe(topicCoverFor(['DATABASE'])?.src);
  });

  it('should give marks a colour that can be told apart from its neighbours', () => {
    const accents = VOCABULARY.map((topic) => topicCoverFor([topic])!.accent);

    for (const accent of accents) {
      expect(accent).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(new Set(accents).size).toBe(VOCABULARY.length);
  });

  it('should serve the pictures as static files, not bundle them', () => {
    expect(topicCoverFor(['RESEARCH'])?.src).toMatch(/^\/covers\/topics\/topic-[a-z-]+\.jpg$/);
  });
});
