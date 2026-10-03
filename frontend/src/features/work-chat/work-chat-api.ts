/**
 * Work Chat: one-to-one messaging between people who share a group.
 *
 * Scope comes from the caller's memberships on the server, so none of these
 * calls takes a workspace a client could substitute.
 */
import { fetchJson } from '../../lib/api-client';

/** Someone the caller may start a conversation with. */
export interface Contact {
  userId: string;
  name: string;
  /** A group both people belong to, which is what permits messaging at all. */
  sharedGroup: string;
}

export interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  /** Null in a conversation nobody has written in yet. */
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  /** Whether the caller sent it, so the UI need not compare ids. */
  mine: boolean;
  createdAt: string;
  readAt: string | null;
}

export async function fetchContacts(): Promise<Contact[]> {
  return fetchJson<Contact[]>('/work-chat/contacts');
}

export async function fetchConversations(): Promise<Conversation[]> {
  return fetchJson<Conversation[]>('/work-chat/conversations');
}

/** Opens the conversation with someone, creating it on first contact. */
export async function openConversation(userId: string): Promise<Conversation> {
  return fetchJson<Conversation>(`/work-chat/conversations/with/${userId}`, {
    method: 'POST',
  });
}

/** Messages newest first, as the server returns them. */
export async function fetchMessages(
  conversationId: string,
  page = 0,
): Promise<DirectMessage[]> {
  return fetchJson<DirectMessage[]>(
    `/work-chat/conversations/${conversationId}/messages?page=${page}`,
  );
}

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<DirectMessage> {
  return fetchJson<DirectMessage>(
    `/work-chat/conversations/${conversationId}/messages`,
    { method: 'POST', body: JSON.stringify({ body }) },
  );
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await fetchJson<void>(`/work-chat/conversations/${conversationId}/read`, {
    method: 'POST',
  });
}

/** Which of the caller's contacts are connected right now. */
export async function fetchPresence(): Promise<string[]> {
  return fetchJson<string[]>('/work-chat/presence');
}
