/**
 * A member's profile, as the caller is entitled to see it.
 *
 * Scope is decided on the server from the groups the two share, so there is no
 * parameter here a client could widen.
 */
import { fetchJson } from '../../lib/api-client';
import type { AvatarColorKey } from '../../components/entity-avatar';

export interface SharedGroup {
  workspaceId: string;
  name: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
}

export interface Contributions {
  documentsContributed: number;
  documentsApproved: number;
  postsWritten: number;
  repliesWritten: number;
  answersAccepted: number;
}

export interface MemberProfile {
  userId: string;
  displayName: string;
  /** What to type to mention them; derived from their email, not the name. */
  handle: string;
  hasAvatar: boolean;
  avatarColor: AvatarColorKey | null;
  joinedAt: string;
  /** Groups both people belong to, with this member's role in each. */
  sharedGroups: SharedGroup[];
  /** Counted inside those same groups. */
  contributions: Contributions;
  canMessage: boolean;
  self: boolean;
}

export async function fetchMemberProfile(userId: string): Promise<MemberProfile> {
  return fetchJson<MemberProfile>(`/users/${userId}/profile`);
}
