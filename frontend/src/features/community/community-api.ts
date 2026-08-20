/**
 * REST API client for community chat, discussions, reactions, and notifications.
 */
import { fetchJson, getAccessToken } from '../../lib/api-client';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/* ---------- Types ---------- */

export interface ChannelResponse {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface CommunityMessageResponse {
  id: string;
  channelId: string;
  authorId: string;
  authorType: 'USER' | 'AI';
  content: string;
  replyToId: string | null;
  mentionsAi: boolean;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
}

export interface DiscussionResponse {
  id: string;
  workspaceId: string;
  authorId: string;
  title: string;
  body: string;
  label: string | null;
  pinned: boolean;
  status: string;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatar: string | null;
}

export interface DiscussionPage {
  content: DiscussionResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface ReplyResponse {
  id: string;
  discussionId: string;
  authorId: string;
  body: string;
  parentReplyId: string | null;
  isAiAnswer: boolean;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
}

export interface NotificationResponse {
  id: string;
  type: string;
  workspaceId: string | null;
  payload: string;
  isRead: boolean;
  createdAt: string;
}

/* ---------- Channels ---------- */

export async function fetchChannels(workspaceId: string): Promise<ChannelResponse[]> {
  return fetchJson<ChannelResponse[]>(`/workspaces/${workspaceId}/channels`);
}

/* ---------- Messages ---------- */

export async function fetchChannelMessages(
  workspaceId: string,
  channelId: string,
  limit = 50,
): Promise<CommunityMessageResponse[]> {
  return fetchJson<CommunityMessageResponse[]>(
    `/workspaces/${workspaceId}/channels/${channelId}/messages?limit=${limit}`,
  );
}

/* ---------- Discussions ---------- */

export async function fetchDiscussions(
  workspaceId: string,
  page = 0,
  size = 20,
  label?: string,
): Promise<DiscussionPage> {
  const labelParam = label ? `&label=${label}` : '';
  return fetchJson<DiscussionPage>(
    `/workspaces/${workspaceId}/discussions?page=${page}&size=${size}${labelParam}`,
  );
}

export async function createDiscussion(
  workspaceId: string,
  data: { title: string; body: string; label?: string },
): Promise<DiscussionResponse> {
  return fetchJson<DiscussionResponse>(`/workspaces/${workspaceId}/discussions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchReplies(workspaceId: string, discussionId: string): Promise<ReplyResponse[]> {
  return fetchJson<ReplyResponse[]>(`/workspaces/${workspaceId}/discussions/${discussionId}/replies`);
}

export async function addReply(
  workspaceId: string,
  discussionId: string,
  data: { body: string; parentReplyId?: string },
): Promise<ReplyResponse> {
  return fetchJson<ReplyResponse>(`/workspaces/${workspaceId}/discussions/${discussionId}/replies`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/* ---------- Reactions ---------- */

export async function toggleReaction(data: {
  targetType: string;
  targetId: string;
  reactionType: string;
}): Promise<void> {
  await fetchJson<void>('/reactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/* ---------- Notifications ---------- */

export async function fetchNotifications(limit = 20): Promise<NotificationResponse[]> {
  return fetchJson<NotificationResponse[]>(`/notifications?limit=${limit}`);
}

export async function fetchUnreadCount(): Promise<{ unreadCount: number }> {
  return fetchJson<{ unreadCount: number }>('/notifications/unread-count');
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await fetchJson<void>(`/notifications/${notificationId}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetchJson<void>('/notifications/read-all', { method: 'POST' });
}

/* ---------- WebSocket STOMP Client ---------- */

let stompClient: Client | null = null;

/**
 * Connects to the STOMP WebSocket broker and subscribes to a channel topic.
 */
export function connectCommunityChat(
  workspaceId: string,
  channelId: string,
  onMessage: (msg: CommunityMessageResponse) => void,
  onConnect?: () => void,
): () => void {
  const token = getAccessToken();
  const socketUrl = '/api/v1/ws/community';

  const client = new Client({
    webSocketFactory: () => new SockJS(socketUrl),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    heartbeatIncoming: 25000,
    heartbeatOutgoing: 25000,
    onConnect: () => {
      client.subscribe(`/topic/workspaces/${workspaceId}/channels/${channelId}`, (frame) => {
        try {
          const msg: CommunityMessageResponse = JSON.parse(frame.body);
          onMessage(msg);
        } catch { /* invalid frame */ }
      });
      onConnect?.();
    },
  });

  client.activate();
  stompClient = client;

  return () => {
    client.deactivate();
    stompClient = null;
  };
}

/**
 * Sends a message through the STOMP WebSocket connection.
 */
export function sendCommunityMessage(
  workspaceId: string,
  channelId: string,
  content: string,
  replyToId?: string,
): void {
  if (!stompClient?.connected) return;

  stompClient.publish({
    destination: `/app/workspaces/${workspaceId}/chat`,
    body: JSON.stringify({ channelId, content, replyToId: replyToId ?? null }),
  });
}
