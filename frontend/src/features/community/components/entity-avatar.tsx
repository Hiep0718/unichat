/**
 * Deterministic letter avatar for a workspace or a person.
 *
 * Replaces the previous identicons, which were fetched from api.dicebear.com —
 * that sent a workspace id to a third party on every card render, and produced
 * abstract patterns nobody could tell apart anyway.
 */
import './entity-avatar.css';

interface EntityAvatarProps {
  /** Name to derive both the letter and the colour from. */
  readonly name: string;
  readonly size?: number;
  /** Rounded square for a workspace, circle for a person. */
  readonly shape?: 'square' | 'circle';
}

/** Stable hash so the same name always gets the same hue. */
function hueFromName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}

export function EntityAvatar({ name, size = 24, shape = 'square' }: EntityAvatarProps) {
  const trimmed = name.trim();
  const letter = trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  const hue = hueFromName(trimmed || '?');

  return (
    <span
      className={`entity-avatar entity-avatar--${shape}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.46),
        // Low saturation, high lightness keeps text readable at any hue.
        background: `hsl(${hue} 62% 92%)`,
        color: `hsl(${hue} 68% 28%)`,
      }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
