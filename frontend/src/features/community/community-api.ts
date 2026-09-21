/**
 * REST API client for discussions, reactions, and notifications.
 */
import { fetchJson, getAccessToken } from '../../lib/api-client';

/* ---------- Types ---------- */

/** The reactions a member can leave. All of them are positive. */
export type ReactionType = 'LIKE' | 'LOVE' | 'INSIGHTFUL' | 'CELEBRATE';

export interface ReactionSummary {
  /** Counts keyed by type, omitting types nobody used. */
  counts: Partial<Record<ReactionType, number>>;
  total: number;
  /** The current user's reaction, null when they left none. */
  myReaction: ReactionType | null;
}

/** Someone who has, or has not, opened a post. */
export interface PostReader {
  userId: string;
  handle: string;
  /** Null for a member who has not opened it yet. */
  readAt: string | null;
}

/**
 * Who has opened a post. Names are present only for owners and editors; other
 * members see the counts alone.
 */
export interface PostReadSummary {
  readCount: number;
  memberCount: number;
  hasRead: boolean;
  readers: PostReader[];
  notYetRead: PostReader[];
}

/** A member the composer can suggest when someone types `@`. */
export interface MentionableMember {
  userId: string;
  handle: string;
}

/** What an attachment is for. Only DOCUMENT files reach the AI assistant. */
export type AttachmentKind = 'IMAGE' | 'DOCUMENT';

export interface PostAttachment {
  id: string;
  kind: AttachmentKind;
  originalName: string;
  mediaType: string;
  byteSize: number;
  /** Set once the file entered the group library, so the assistant can cite it. */
  documentId: string | null;
}

export interface DiscussionResponse {
  id: string;
  workspaceId: string;
  workspaceName: string | null;
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
  /** Set once the author edited the post. */
  editedAt: string | null;
  voteScore: number;
  reactions: ReactionSummary;
  authorName: string;
  authorAvatar: string | null;
  tags: string[];
  acceptedReplyId: string | null;
  hasAcceptedAnswer: boolean;
  isBookmarked: boolean;
  attachments: PostAttachment[];
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
  voteScore: number;
  reactions: ReactionSummary;
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

/**
 * Lists posts in one group.
 *
 * @param query optional full-text search across title and body
 */
export async function fetchDiscussions(
  workspaceId: string,
  page = 0,
  size = 20,
  label?: string,
  sort = 'NEW',
  query?: string,
): Promise<DiscussionPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort });
  if (label) params.set('label', label);
  if (query) params.set('q', query);
  return fetchJson<DiscussionPage>(
    `/workspaces/${workspaceId}/discussions?${params.toString()}`,
  );
}

export async function getDiscussion(
  workspaceId: string,
  discussionId: string,
): Promise<DiscussionResponse> {
  return fetchJson<DiscussionResponse>(`/workspaces/${workspaceId}/discussions/${discussionId}`);
}

export async function createDiscussion(
  workspaceId: string,
  data: { title: string; body: string; label?: string; tags?: string[] },
): Promise<DiscussionResponse> {
  return fetchJson<DiscussionResponse>(`/workspaces/${workspaceId}/discussions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDiscussion(
  workspaceId: string,
  discussionId: string,
  data: { title: string; body: string; tags?: string[] },
): Promise<DiscussionResponse> {
  return fetchJson<DiscussionResponse>(`/workspaces/${workspaceId}/discussions/${discussionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDiscussion(workspaceId: string, discussionId: string): Promise<void> {
  await fetchJson<void>(`/workspaces/${workspaceId}/discussions/${discussionId}`, {
    method: 'DELETE',
  });
}

/** Pins or unpins a post. Owners and editors only. */
export async function setPostPinned(
  workspaceId: string,
  discussionId: string,
  pinned: boolean,
): Promise<DiscussionResponse> {
  return fetchJson<DiscussionResponse>(
    `/workspaces/${workspaceId}/discussions/${discussionId}/pinned?pinned=${pinned}`,
    { method: 'PUT' },
  );
}

/* ---------- Read receipts ---------- */

/** Records that the current user opened a post. Safe to call repeatedly. */
export async function markPostRead(workspaceId: string, discussionId: string): Promise<void> {
  await fetchJson<void>(`/workspaces/${workspaceId}/discussions/${discussionId}/read`, {
    method: 'POST',
  });
}

export async function fetchPostReaders(
  workspaceId: string,
  discussionId: string,
): Promise<PostReadSummary> {
  return fetchJson<PostReadSummary>(
    `/workspaces/${workspaceId}/discussions/${discussionId}/readers`,
  );
}

/* ---------- Attachments ---------- */

/**
 * Uploads one attachment to a post.
 *
 * Uses XHR rather than fetch so the composer can show upload progress.
 */
export function uploadPostAttachment(
  workspaceId: string,
  discussionId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<PostAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  const token = getAccessToken();

  return new Promise<PostAttachment>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/v1/workspaces/${workspaceId}/discussions/${discussionId}/attachments`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as PostAttachment);
        } catch {
          reject(new Error('Phản hồi từ máy chủ không hợp lệ'));
        }
        return;
      }
      try {
        const problem = JSON.parse(xhr.responseText);
        reject(new Error(problem.detail || problem.title || 'Tải tệp đính kèm thất bại'));
      } catch {
        reject(new Error(`Tải tệp đính kèm thất bại (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Lỗi kết nối khi tải tệp đính kèm'));
    xhr.send(formData);
  });
}

export async function deletePostAttachment(
  workspaceId: string,
  discussionId: string,
  attachmentId: string,
): Promise<void> {
  await fetchJson<void>(
    `/workspaces/${workspaceId}/discussions/${discussionId}/attachments/${attachmentId}`,
    { method: 'DELETE' },
  );
}

/**
 * Fetches attachment bytes as an object URL.
 *
 * The endpoint requires a bearer token, which an `<img src>` cannot send, so
 * the bytes are fetched here and handed over as a blob URL. Callers must revoke
 * the URL when done.
 */
export async function fetchAttachmentObjectUrl(
  workspaceId: string,
  discussionId: string,
  attachmentId: string,
): Promise<string> {
  const token = getAccessToken();
  const response = await fetch(
    `/api/v1/workspaces/${workspaceId}/discussions/${discussionId}/attachments/${attachmentId}/content`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );

  if (!response.ok) {
    throw new Error(`Không tải được tệp đính kèm (HTTP ${response.status})`);
  }
  return URL.createObjectURL(await response.blob());
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

/**
 * Applies a reaction and returns the target's new summary, so the caller
 * renders the stored counts instead of guessing them.
 */
export async function toggleReaction(data: {
  targetType: 'DISCUSSION' | 'DISCUSSION_REPLY';
  targetId: string;
  reactionType: ReactionType;
}): Promise<ReactionSummary> {
  return fetchJson<ReactionSummary>('/reactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Members the composer may suggest when someone types `@`. */
export async function fetchMentionableMembers(
  workspaceId: string,
): Promise<MentionableMember[]> {
  return fetchJson<MentionableMember[]>(
    `/workspaces/${workspaceId}/discussions/mentionable-members`,
  );
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
