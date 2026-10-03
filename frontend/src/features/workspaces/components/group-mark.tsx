/**
 * A group's small square mark, used where there is no room for its cover.
 *
 * It takes the same colour the group's card uses, from {@link ../group-theme},
 * so scanning the left rail for the violet group finds the one whose card is
 * violet. The previous letter avatar hashed the group's name into a pastel,
 * which meant the rail and the card disagreed about what colour a group was.
 */
import { groupThemeFor, markBackground } from '../group-theme';
import './group-mark.css';

interface GroupMarkProps {
  readonly workspaceId: string;
  readonly name: string;
  readonly size?: number;
}

export function GroupMark({ workspaceId, name, size = 24 }: GroupMarkProps) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <span
      className="group-mark"
      style={{
        width: size,
        height: size,
        background: markBackground(groupThemeFor(workspaceId)),
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
