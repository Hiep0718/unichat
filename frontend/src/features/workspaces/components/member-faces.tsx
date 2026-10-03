/**
 * The overlapping row of member pictures on a group's card.
 *
 * A count alone ("12 Thành viên") says how big a group is but not whether it is
 * one the viewer belongs in. Faces answer that at a glance, which is why they
 * sit where the count used to.
 */
import { EntityAvatar } from '../../../components/entity-avatar';

import type { AvatarColorKey } from '../../../components/entity-avatar';
import type { WorkspaceFace } from '../workspace-schema';
import './member-faces.css';

interface MemberFacesProps {
  readonly faces: readonly WorkspaceFace[];
  /** Total active members, so the overflow count is the real remainder. */
  readonly memberCount: number;
  readonly size?: number;
}

/** The server only sends colours it accepts, but the type is a plain string. */
function toColourKey(value: string | null): AvatarColorKey | null {
  const keys = ['navy', 'teal', 'plum', 'moss', 'clay', 'slate'];
  return value && keys.includes(value) ? (value as AvatarColorKey) : null;
}

export function MemberFaces({ faces, memberCount, size = 26 }: MemberFacesProps) {
  if (faces.length === 0) {
    return null;
  }

  const remaining = memberCount - faces.length;

  return (
    <div className="member-faces">
      <div className="member-faces__stack">
        {faces.map((face) => (
          <span
            key={face.userId}
            className="member-faces__slot"
            style={{ width: size, height: size }}
            title={face.displayName}
          >
            <EntityAvatar
              name={face.displayName}
              size={size}
              shape="circle"
              userId={face.userId}
              hasAvatar={face.hasAvatar}
              avatarColor={toColourKey(face.avatarColor)}
            />
          </span>
        ))}
      </div>
      {remaining > 0 && <span className="member-faces__more">+{remaining}</span>}
    </div>
  );
}
