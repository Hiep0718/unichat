/**
 * Group administration: creating a group, naming it, and who is in it.
 *
 * Split from work-chat-api the way the server splits its controllers:
 * administering a group is a different job from talking in one. Reading and
 * sending messages are the same calls for a group as for a one-to-one thread
 * and stay there.
 */
import { fetchJson } from '../../lib/api-client';
import type { ChatParticipant, Conversation } from './work-chat-api';

/** Creates a group with the caller as its owner. */
export async function createGroup(
  title: string,
  memberIds: readonly string[],
): Promise<Conversation> {
  return fetchJson<Conversation>('/work-chat/groups', {
    method: 'POST',
    body: JSON.stringify({ title, memberIds }),
  });
}

/** Renames a group. Only its owner may, which the server enforces. */
export async function renameGroup(
  conversationId: string,
  title: string,
): Promise<Conversation> {
  return fetchJson<Conversation>(`/work-chat/groups/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function fetchParticipants(
  conversationId: string,
): Promise<ChatParticipant[]> {
  return fetchJson<ChatParticipant[]>(
    `/work-chat/conversations/${conversationId}/participants`,
  );
}

export async function addGroupMember(
  conversationId: string,
  userId: string,
): Promise<ChatParticipant[]> {
  return fetchJson<ChatParticipant[]>(`/work-chat/groups/${conversationId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function removeGroupMember(
  conversationId: string,
  userId: string,
): Promise<ChatParticipant[]> {
  return fetchJson<ChatParticipant[]>(
    `/work-chat/groups/${conversationId}/members/${userId}`,
    { method: 'DELETE' },
  );
}

/**
 * Leaves a group.
 *
 * Its own call rather than removing yourself, because an owner leaving also
 * hands the group on to whoever joined earliest.
 */
export async function leaveGroup(conversationId: string): Promise<void> {
  await fetchJson<void>(`/work-chat/groups/${conversationId}/leave`, { method: 'POST' });
}
