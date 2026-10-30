import {
  TOPIC_COVER_COUNT,
  topicCoverFor,
} from '../../../src/features/workspaces/topic-covers';

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
  it('should give every topic in the vocabulary a picture of its own', async () => {
    expect(TOPIC_COVER_COUNT).toBe(VOCABULARY.length);

    const sources = VOCABULARY.map((topic) => topicCoverFor([topic])?.source);
    expect(sources.every(Boolean)).toBe(true);
    expect(new Set(sources).size).toBe(VOCABULARY.length);
  });

  it('should bundle the pictures rather than fetch them over the network', async () => {
    // A string would mean a URL, which a phone on another network cannot reach.
    expect(typeof topicCoverFor(['PROGRAMMING'])?.source).not.toBe('string');
  });

  it('should fall back for a group that carries no topic', async () => {
    expect(topicCoverFor(undefined)).toBeNull();
    expect(topicCoverFor([])).toBeNull();
  });

  it('should fall back rather than break when the vocabulary has grown past this build', async () => {
    expect(topicCoverFor(['QUANTUM_BASKET_WEAVING'])).toBeNull();
  });

  it('should ignore an unknown topic when a known one sits beside it', async () => {
    expect(topicCoverFor(['QUANTUM_BASKET_WEAVING', 'DATABASE'])?.accent).toBe(
      topicCoverFor(['DATABASE'])?.accent,
    );
  });

  it('should pick the same picture however the API ordered the topics', async () => {
    const forward = topicCoverFor(['PROGRAMMING', 'DATABASE']);
    const reversed = topicCoverFor(['DATABASE', 'PROGRAMMING']);

    expect(forward?.source).toBe(reversed?.source);
    expect(forward?.source).toBe(topicCoverFor(['PROGRAMMING'])?.source);
  });

  it('should read a topic whatever case it arrives in', async () => {
    expect(topicCoverFor(['database'])?.accent).toBe(topicCoverFor(['DATABASE'])?.accent);
  });

  it('should carry the same accents the web does, so one group is one colour', async () => {
    // Spot-checked against frontend/src/features/workspaces/topic-covers.ts.
    expect(topicCoverFor(['PROGRAMMING'])?.accent).toBe('#4b8edd');
    expect(topicCoverFor(['DATABASE'])?.accent).toBe('#6b7280');
    expect(topicCoverFor(['RESEARCH'])?.accent).toBe('#b84bdd');
    expect(topicCoverFor(['OTHER'])?.accent).toBe('#4bdd77');
  });

  it('should give marks a colour that can be told apart from its neighbours', async () => {
    const accents = VOCABULARY.map((topic) => topicCoverFor([topic])!.accent);

    for (const accent of accents) {
      expect(accent).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(new Set(accents).size).toBe(VOCABULARY.length);
  });
});
