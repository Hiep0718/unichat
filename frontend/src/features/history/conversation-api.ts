import { fetchJson } from '../../lib/api-client';
import type { CitationItem, AnswerSection } from '../chat/chat-types';

export interface ConversationItem {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  operationId?: string | null;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sequence?: number | undefined;
  redacted?: boolean | undefined;
  knowledgeMode?: 'STRICT' | 'EXPANDED' | undefined;
  sections?: AnswerSection[] | undefined;
  intent?: string | null;
  refusalCode?: string | null;
  providerModel?: string | null;
  createdAt: string;
  citations?: CitationItem[];
}


export interface ConversationDetailResponse extends ConversationItem {
  messages: MessageItem[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  snapshotSequence?: number | undefined;
}

/** Reads older messages against a stable sequence snapshot. */
export function fetchConversationMessages(workspaceId: string, conversationId: string, page = 0, size = 20,
  snapshotSequence?: number): Promise<PageResponse<MessageItem>> {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (snapshotSequence !== undefined) query.set('snapshotSequence', String(snapshotSequence));
  return fetchJson(`/workspaces/${workspaceId}/conversations/${conversationId}/messages?${query}`);
}

export async function fetchWorkspaceConversations(
  workspaceId: string,
  page = 0,
  size = 20
): Promise<PageResponse<ConversationItem>> {
  return fetchJson<PageResponse<ConversationItem>>(
    `/workspaces/${workspaceId}/conversations?page=${page}&size=${size}`
  );
}

export async function createWorkspaceConversation(
  workspaceId: string
): Promise<ConversationItem> {
  return fetchJson<ConversationItem>(`/workspaces/${workspaceId}/conversations`, {
    method: 'POST',
  });
}

export async function fetchConversationDetail(
  workspaceId: string,
  conversationId: string
): Promise<ConversationDetailResponse> {
  return fetchJson<ConversationDetailResponse>(
    `/workspaces/${workspaceId}/conversations/${conversationId}`
  );
}

export async function deleteWorkspaceConversation(
  workspaceId: string,
  conversationId: string
): Promise<void> {
  return fetchJson<void>(`/workspaces/${workspaceId}/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}
