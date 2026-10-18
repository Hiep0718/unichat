/**
 * A group's small square mark, used where there is no room for its cover.
 *
 * It carries the colour of the picture on that group's card, so scanning the
 * left rail for the violet group finds the one whose card is violet. The
 * colour comes from {@link ../cover-assignment-context}, the same decision
 * that chose the picture — which also means no two groups on screen share a
 * mark, as they did while each id was hashed on its own.
 *
 * Before the cards carried pictures this took its gradient from
 * {@link ../group-theme}. That stopped agreeing with the card the day the
 * pictures arrived, which is how the duplicate marks were noticed.
 */
import { useAssignedCover } from '../cover-assignment-context';
import './group-mark.css';

interface GroupMarkProps {
  readonly workspaceId: string;
  readonly name: string;
  readonly size?: number;
}

export function GroupMark({ workspaceId, name, size = 24 }: GroupMarkProps) {
  const initial = name.trim().charAt(0).toUpperCase();
  const { accent } = useAssignedCover(workspaceId);

  return (
    <span
      className="group-mark"
      style={{
        width: size,
        height: size,
        background: accent,
        // Tracks the tile so the letter stays centred at any size.
        fontSize: Math.round(size * 0.46),
        borderRadius: Math.max(6, Math.round(size * 0.3)),
      }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
