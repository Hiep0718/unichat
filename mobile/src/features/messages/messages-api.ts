/**
 * Tin nhắn giữa người với người (Work Chat) trên di động.
 *
 * Cùng các endpoint mà web dùng. Phạm vi lấy từ tư cách thành viên của người
 * gọi ở phía máy chủ, nên không lời gọi nào nhận một workspace mà client có
 * thể tráo.
 */
import { z } from 'zod';

import { fetchJson } from '../../lib/api-client';

/** Người mà người gọi được phép bắt đầu trò chuyện. */
export interface Contact {
  readonly userId: string;
  readonly name: string;
  /** Một nhóm cả hai cùng tham gia, chính là điều cho phép nhắn tin. */
  readonly sharedGroup: string;
}

export type ConversationKind = 'DIRECT' | 'GROUP';

export interface ChatParticipant {
  readonly userId: string;
  readonly name: string;
  readonly role: 'OWNER' | 'MEMBER';
  /** Đây có phải người gọi không, để UI khỏi phải so id. */
  readonly me: boolean;
}

export interface Conversation {
  readonly id: string;
  readonly kind: ConversationKind;
  /** Tên nhóm, hoặc tên người kia. */
  readonly title: string;
  readonly otherUserId: string | null;
  readonly participants: readonly ChatParticipant[];
  readonly lastMessage: string | null;
  readonly lastMessageAt: string | null;
  readonly unreadCount: number;
  readonly hasAvatar: boolean;
}

/** Tệp gửi trong cuộc trò chuyện. */
export interface ChatAttachment {
  readonly id: string;
  readonly kind: 'IMAGE' | 'FILE';
  readonly originalName: string;
  readonly mediaType: string;
  readonly byteSize: number;
}

export interface DirectMessage {
  readonly id: string;
  readonly conversationId: string;
  readonly senderId: string;
  readonly senderName: string;
  /** Null khi tin chỉ mang tệp. */
  readonly body: string | null;
  readonly mine: boolean;
  readonly createdAt: string;
  readonly attachments: readonly ChatAttachment[];
}

export type CallStatus = 'RINGING' | 'ACTIVE' | 'ENDED' | 'DECLINED' | 'MISSED' | 'FAILED';

/** Một dòng lịch sử cuộc gọi, đã tính sẵn chiều và thời lượng ở máy chủ. */
export interface CallHistoryEntry {
  readonly id: string;
  readonly outgoing: boolean;
  readonly media: 'AUDIO' | 'VIDEO';
  readonly status: CallStatus;
  readonly startedAt: string;
  readonly talkSeconds: number;
}

/** Khớp giới hạn `SendMessageRequest` của Core API. */
export const MAX_MESSAGE_LENGTH = 4000;

export const MESSAGE_PAGE_SIZE = 30;

const idSchema = z.string().uuid('Mã cuộc trò chuyện không hợp lệ');
const pageSchema = z.number().int().min(0);
const bodySchema = z
  .string()
  .trim()
  .min(1, 'Nội dung tin nhắn không được để trống')
  .max(MAX_MESSAGE_LENGTH, `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự`);

/** Lời gọi tới Work Chat; mọi tham số đều được kiểm tra trước khi rời máy. */
export const messagesApi = {
  /** Những người có thể nhắn tin, vì cùng ít nhất một nhóm. */
  fetchContacts(): Promise<Contact[]> {
    return fetchJson<Contact[]>('/work-chat/contacts');
  },

  /** Mọi cuộc trò chuyện của người gọi, mới nhất trước. */
  fetchConversations(): Promise<Conversation[]> {
    return fetchJson<Conversation[]>('/work-chat/conversations');
  },

  /** Mở cuộc trò chuyện với một người, tạo mới ở lần liên hệ đầu. */
  openConversation(userId: string): Promise<Conversation> {
    const id = z.string().uuid('Mã người dùng không hợp lệ').parse(userId);
    return fetchJson<Conversation>(`/work-chat/conversations/with/${id}`, { method: 'POST' });
  },

  /** Tin nhắn mới nhất trước, đúng thứ tự máy chủ trả. */
  fetchMessages(conversationId: string, page = 0): Promise<DirectMessage[]> {
    const id = idSchema.parse(conversationId);
    const valid = pageSchema.parse(page);
    return fetchJson<DirectMessage[]>(
      `/work-chat/conversations/${id}/messages?page=${valid}&size=${MESSAGE_PAGE_SIZE}`,
    );
  },

  /** Gửi một tin chữ. */
  sendMessage(conversationId: string, body: string): Promise<DirectMessage> {
    const id = idSchema.parse(conversationId);
    const text = bodySchema.parse(body);
    return fetchJson<DirectMessage>(`/work-chat/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: text }),
    });
  },

  /** Đánh dấu đã đọc tới hiện tại. */
  async markRead(conversationId: string): Promise<void> {
    const id = idSchema.parse(conversationId);
    await fetchJson<void>(`/work-chat/conversations/${id}/read`, { method: 'POST' });
  },

  /** Các cuộc gọi của một cuộc trò chuyện, mới nhất trước. */
  async fetchCallHistory(conversationId: string): Promise<CallHistoryEntry[]> {
    const id = idSchema.parse(conversationId);
    const page = await fetchJson<{ content?: CallHistoryEntry[] }>(
      `/conversations/${id}/calls?page=0&size=50`,
    );
    return page.content ?? [];
  },
};
