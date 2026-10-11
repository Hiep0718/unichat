import { isValidUuid } from '../../src/lib/uuid';

describe('isValidUuid', () => {
  it('returns true for valid standard UUIDs', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidUuid('40a7dbf2-70b5-4b82-aa2c-8cb4943fcf3a')).toBe(true);
  });

  it('returns false for non-UUID strings and route templates', () => {
    expect(isValidUuid('undefined')).toBe(false);
    expect(isValidUuid('[id]')).toBe(false);
    expect(isValidUuid('[conversationId]')).toBe(false);
    expect(isValidUuid('temp')).toBe(false);
    expect(isValidUuid('12345')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
  });
});
