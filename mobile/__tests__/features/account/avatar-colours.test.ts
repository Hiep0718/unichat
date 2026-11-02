import {
  AVATAR_COLOURS,
  AVATAR_COLOR_KEYS,
  avatarPaint,
  toAvatarColorKey,
} from '../../../src/features/account/avatar-colours';

describe('avatar-colours', () => {
  describe('toAvatarColorKey', () => {
    it('accepts a key the server recognises, whatever its case', () => {
      expect(toAvatarColorKey('MOSS')).toBe('moss');
      expect(toAvatarColorKey(' clay ')).toBe('clay');
    });

    it('rejects a value outside the fixed palette', () => {
      expect(toAvatarColorKey('#ff0000')).toBeNull();
      expect(toAvatarColorKey('')).toBeNull();
      expect(toAvatarColorKey(null)).toBeNull();
      expect(toAvatarColorKey(undefined)).toBeNull();
    });
  });

  describe('avatarPaint', () => {
    it('uses the chosen colour when the member picked one', () => {
      expect(avatarPaint('Hùng', 'teal')).toEqual(AVATAR_COLOURS.teal);
    });

    it('derives a stable colour from the name when none was chosen', () => {
      const first = avatarPaint('Nguyễn Văn Hùng', null);
      const again = avatarPaint('Nguyễn Văn Hùng', null);

      expect(first).toEqual(again);
      expect(first.bg).toMatch(/^hsl\(\d+, 62%, 92%\)$/);
    });

    it('gives different names different colours', () => {
      expect(avatarPaint('An', null).bg).not.toBe(avatarPaint('Bình', null).bg);
    });

    it('falls back to a colour for a blank name instead of crashing', () => {
      expect(avatarPaint('   ', null).bg).toBe(avatarPaint('?', null).bg);
    });
  });

  it('offers exactly the six colours the server accepts', () => {
    expect([...AVATAR_COLOR_KEYS].sort()).toEqual(Object.keys(AVATAR_COLOURS).sort());
  });
});
