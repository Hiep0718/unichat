/**
 * Avatar for a workspace or a person.
 *
 * A person who uploaded a picture gets it; everyone else gets a letter on a
 * colour, either the one they chose or one derived from their name. The letter
 * is the default rather than a placeholder: nobody has to upload anything to
 * be recognisable in a list.
 *
 * Replaces the previous identicons, which were fetched from api.dicebear.com —
 * that sent a workspace id to a third party on every card render, and produced
 * abstract patterns nobody could tell apart anyway.
 */
import { useEffect, useState } from 'react';

import { loadAvatar } from './avatar-image-cache';
import './entity-avatar.css';

/** Must match the set the server accepts (AvatarColor). */
export type AvatarColorKey = 'navy' | 'teal' | 'plum' | 'moss' | 'clay' | 'slate';

/** Background and ink per chosen colour, both carrying text contrast. */
const CHOSEN_COLOURS: Record<AvatarColorKey, { bg: string; ink: string }> = {
  navy: { bg: '#dbe3f7', ink: '#1e3a8a' },
  teal: { bg: '#cceef2', ink: '#115e64' },
  plum: { bg: '#eedcf0', ink: '#6b2178' },
  moss: { bg: '#dcecd6', ink: '#33612a' },
  clay: { bg: '#f6e0d3', ink: '#8a4118' },
  slate: { bg: '#dfe3e9', ink: '#33415c' },
};

interface EntityAvatarProps {
  /** Name to derive both the letter and, absent a choice, the colour from. */
  readonly name: string;
  readonly size?: number;
  /** Rounded square for a workspace, circle for a person. */
  readonly shape?: 'square' | 'circle';
  /** Person whose uploaded picture to show, when they have one. */
  readonly userId?: string;
  /** Whether that person uploaded a picture; skips the request when false. */
  readonly hasAvatar?: boolean;
  /** Colour the person chose, overriding the one derived from their name. */
  readonly avatarColor?: AvatarColorKey | null;
}

/** Stable hash so the same name always gets the same hue. */
function hueFromName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}

export function EntityAvatar({
  name,
  size = 24,
  shape = 'square',
  userId,
  hasAvatar = false,
  avatarColor = null,
}: EntityAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !hasAvatar) {
      return;
    }
    let cancelled = false;
    loadAvatar(userId).then((url) => {
      // A failed load leaves the letter avatar in place rather than a gap.
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, hasAvatar]);

  if (imageUrl) {
    return (
      <img
        className={`entity-avatar entity-avatar--${shape}`}
        style={{ width: size, height: size }}
        src={imageUrl}
        alt=""
        aria-hidden="true"
      />
    );
  }

  const trimmed = name.trim();
  const letter = trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  const chosen = avatarColor ? CHOSEN_COLOURS[avatarColor] : null;
  const hue = hueFromName(trimmed || '?');

  return (
    <span
      className={`entity-avatar entity-avatar--${shape}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.46),
        // Low saturation, high lightness keeps text readable at any hue.
        background: chosen ? chosen.bg : `hsl(${hue} 62% 92%)`,
        color: chosen ? chosen.ink : `hsl(${hue} 68% 28%)`,
      }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
