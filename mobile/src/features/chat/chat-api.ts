import { z } from 'zod';
import { fetchJson, ApiError } from '../../lib/api-client';
import { askWorkspaceQuestion } from './chat-transport';
import type { ConversationItem, MessageItem } from '../../types/api';
import type { ChatRequestOptions, AskQuestionPayload, QuestionResponse } from './chat-types';

/** A stable server page; page zero contains the newest messages in sequence order. */
export interface ChatPage<T> {
  readonly content: T[]; readonly items: T[]; readonly number: number; readonly size: number;
  readonly totalElements: number; readonly totalPages: number; readonly snapshotSequence?: number;
  readonly nextCursor?: string;
}
export interface ConversationDetailResponse { readonly conversation: ConversationItem; readonly messages: MessageItem[] }
interface ConversationDto { id: string; workspaceId: string; title: string; createdAt: string; updatedAt?: string }
interface MessageDto extends Omit<MessageItem, 'sender'> { role: MessageItem['sender'] }
interface PageDto<T> { content: T[]; number: number; size: number; totalElements: number; totalPages: number; snapshotSequence?: number }
const paginationSchema = z.object({ page: z.number().int().min(0).default(0), size: z.number().int().min(1).max(100).default(20) });

function conversationItem(source: ConversationDto): ConversationItem {
  return { id: source.id, workspaceId: source.workspaceId, title: source.title,
    createdAt: source.createdAt, lastMessageAt: source.updatedAt ?? source.createdAt };
}
function messageItem(source: MessageDto): MessageItem {
  return { ...source, sender: source.role, content: source.redacted ? 'Nội dung không còn khả dụng do quyền nguồn đã thay đổi.' : source.content,
    citations: source.redacted ? [] : source.citations ?? [], sections: source.redacted ? [] : source.sections ?? [] };
}
function mapPage<Source, Result>(source: PageDto<Source>, map: (item: Source) => Result): ChatPage<Result> {
  const content = source.content.map(map);
  return { ...source, content, items: content };
}

/** Communicates with the owner-only paginated Core chat API, without ignored cursors. */
export const chatApi = {
  /** Reads one actual page, accepting limit only as a legacy size alias. */
  async getConversations(workspaceId: string, params: { limit?: number; cursor?: string; page?: number; size?: number } = {}): Promise<ChatPage<ConversationItem>> {
    if (params.cursor) throw new ApiError(400, 'Cursor không được hỗ trợ. Hãy sử dụng page và size.');
    const { page, size } = paginationSchema.parse({ page: params.page, size: params.size ?? params.limit });
    const result = await fetchJson<PageDto<ConversationDto>>(`/workspaces/${workspaceId}/conversations?page=${page}&size=${size}`);
    return mapPage(result, conversationItem);
  },
  /** Reads only the latest bounded messages included in conversation metadata. */
  async getConversation(workspaceId: string, conversationId: string): Promise<ConversationDetailResponse> {
    const result = await fetchJson<ConversationDto & { messages: MessageDto[] }>(`/workspaces/${workspaceId}/conversations/${conversationId}`);
    return { conversation: conversationItem(result), messages: result.messages.map(messageItem) };
  },
  /** Reads older messages against the original snapshot instead of shifting offsets. */
  async getMessages(workspaceId: string, conversationId: string, page = 0, size = 20, snapshotSequence?: number): Promise<ChatPage<MessageItem>> {
    const valid = paginationSchema.parse({ page, size });
    const query = new URLSearchParams({ page: String(valid.page), size: String(valid.size) });
    if (snapshotSequence !== undefined) query.set('snapshotSequence', String(z.number().int().nonnegative().parse(snapshotSequence)));
    const result = await fetchJson<PageDto<MessageDto>>(`/workspaces/${workspaceId}/conversations/${conversationId}/messages?${query}`);
    return mapPage(result, messageItem);
  },
  /** Creates metadata without inventing a user turn. */
  async createConversation(workspaceId: string, _title?: string): Promise<ConversationItem> {
    return conversationItem(await fetchJson<ConversationDto>(`/workspaces/${workspaceId}/conversations`, { method: 'POST' }));
  },
  /** Deletes only the caller's conversation. */
  deleteConversation(workspaceId: string, conversationId: string): Promise<void> {
    return fetchJson(`/workspaces/${workspaceId}/conversations/${conversationId}`, { method: 'DELETE' });
  },
  /** Uses the same immutable operation namespace as streaming asks. */
  askQuestion(workspaceId: string, payload: AskQuestionPayload, options?: ChatRequestOptions): Promise<QuestionResponse> {
    return askWorkspaceQuestion(workspaceId, payload, options);
  },
};
