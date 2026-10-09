/**
 * Work Chat: one-to-one messaging between people who share a group.
 *
 * Scope comes from the caller's memberships on the server, so none of these
 * calls takes a workspace a client could substitute.
 */
import {
  ApiError,
  fetchBlob,
  fetchJson,
  getAccessToken,
  getApiBaseUrl,
} from '../../lib/api-client';

/** Someone the caller may start a conversation with. */
export interface Contact {
  userId: string;
  name: string;
  /** A group both people belong to, which is what permits messaging at all. */
  sharedGroup: string;
}

/** Whether a conversation is between two people or among several. */
export type ConversationKind = 'DIRECT' | 'GROUP';

/** Only an owner renames a group or changes who is in it. */
export type ParticipantRole = 'OWNER' | 'MEMBER';

export interface ChatParticipant {
  userId: string;
  name: string;
  role: ParticipantRole;
  /** Whether this is the caller, so the UI need not compare ids. */
  me: boolean;
}

export interface Conversation {
  id: string;
  kind: ConversationKind;
  /** The group's name, or the other person's — filled for both kinds. */
  title: string;
  /** Null in a group, where there is no single other person. */
  otherUserId: string | null;
  participants: ChatParticipant[];
  /** Null in a conversation nobody has written in yet. */
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

/** Matches the server ceiling, so the picker can stop before a refusal. */
export const MAX_GROUP_PARTICIPANTS = 50;

/** Images the server renders inline; anything else is a download. */
export const CHAT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

/** Mirrors the server allowlist. No SVG and no HTML: both can run script. */
export const CHAT_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const MAX_CHAT_FILES = 5;

/** Per message, not per file, because the server caps the whole request. */
export const MAX_CHAT_TOTAL_BYTES = 20 * 1024 * 1024;

/** A file sent inside a conversation. Never a retrieval source for the AI. */
export interface ChatAttachment {
  id: string;
  kind: 'IMAGE' | 'FILE';
  originalName: string;
  mediaType: string;
  byteSize: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  /** Null in a message that carries only files. */
  body: string | null;
  /** Whether the caller sent it, so the UI need not compare ids. */
  mine: boolean;
  createdAt: string;
  attachments: ChatAttachment[];
}

/**
 * Why this batch of files cannot be sent, or null when it can.
 *
 * The one home for the client-side mirror of the server's rules, so the
 * composer and its tests cannot drift apart from each other. The server still
 * checks everything: this only spares the user a 20 MiB round trip to be told
 * no.
 */
export function describeFileRejection(files: readonly File[]): string | null {
  if (files.length > MAX_CHAT_FILES) {
    return `Mỗi tin nhắn chỉ gửi được tối đa ${MAX_CHAT_FILES} tệp`;
  }
  const unsupported = files.find(
    (file) => !CHAT_IMAGE_TYPES.includes(file.type) && !CHAT_FILE_TYPES.includes(file.type),
  );
  if (unsupported) {
    return `Không hỗ trợ định dạng của "${unsupported.name}". `
      + 'Chỉ gửi được ảnh (PNG, JPEG, WebP, GIF) và tệp PDF, DOCX, TXT.';
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_CHAT_TOTAL_BYTES) {
    return 'Tổng dung lượng tệp trong một tin nhắn vượt quá 20 MiB';
  }
  return null;
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

/**
 * Sends a message, with files when there are any.
 *
 * Text and files go in one request: the server pushes the message to the
 * other person the moment it commits, so a two-step upload would show them a
 * bubble whose file had not arrived.
 *
 * @param onProgress upload percentage, worth showing for a 20 MiB message
 */
export async function sendMessage(
  conversationId: string,
  body: string,
  files: readonly File[] = [],
  onProgress?: (percent: number) => void,
): Promise<DirectMessage> {
  if (files.length === 0) {
    return fetchJson<DirectMessage>(
      `/work-chat/conversations/${conversationId}/messages`,
      { method: 'POST', body: JSON.stringify({ body }) },
    );
  }
  return uploadMessage(conversationId, body, files, onProgress);
}

/**
 * Multipart send over XHR rather than fetch, so the composer can report
 * progress on a large attachment instead of looking frozen.
 */
function uploadMessage(
  conversationId: string,
  body: string,
  files: readonly File[],
  onProgress?: (percent: number) => void,
): Promise<DirectMessage> {
  const form = new FormData();
  // Left out entirely when blank, so the server stores null rather than an
  // empty string.
  if (body.trim()) form.append('body', body.trim());
  files.forEach((file) => form.append('files', file));

  const token = getAccessToken();
  return new Promise<DirectMessage>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `${getApiBaseUrl()}/api/v1/work-chat/conversations/${conversationId}/messages`,
    );
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
          resolve(JSON.parse(xhr.responseText) as DirectMessage);
        } catch {
          reject(new Error('Phản hồi từ máy chủ không hợp lệ'));
        }
        return;
      }
      // An ApiError means the server said why, which the composer shows
      // verbatim: "the file is too large" is worth reading.
      reject(new ApiError(xhr.status, problemDetail(xhr.responseText)));
    };
    // Status 0 is what XHR reports when the request never arrived.
    xhr.onerror = () => reject(
      new ApiError(0, 'Không gửi được tệp. Kiểm tra kết nối rồi thử lại.'),
    );
    xhr.send(form);
  });
}

/** The server's own words when it has any, since they name the real reason. */
function problemDetail(responseText: string): string {
  try {
    const problem = JSON.parse(responseText) as { detail?: string; title?: string };
    return problem.detail ?? problem.title ?? 'Không gửi được tin nhắn';
  } catch {
    return 'Không gửi được tin nhắn';
  }
}

/**
 * Fetches one attachment as a blob URL.
 *
 * `<img src>` cannot send a bearer token, and the endpoint checks
 * participation on every read, so the bytes have to come through here.
 *
 * The caller owns the returned URL and must revoke it.
 */
export async function fetchChatAttachmentObjectUrl(
  conversationId: string,
  messageId: string,
  attachmentId: string,
): Promise<string> {
  const blob = await fetchBlob(
    `/work-chat/conversations/${conversationId}/messages/${messageId}`
    + `/attachments/${attachmentId}/content`,
  );
  return URL.createObjectURL(blob);
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
