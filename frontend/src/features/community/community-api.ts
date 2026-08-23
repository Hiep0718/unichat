/**
 * REST API client for discussions, reactions, and notifications.
 */
import { fetchJson } from '../../lib/api-client';

/* ---------- Types ---------- */

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
