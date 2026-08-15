import { fetchJson } from '../../lib/api-client';

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
  role: 'USER' | 'ASSISTANT';
  content: string;
  intent?: string | null;
  refusalCode?: string | null;
  providerModel?: string | null;
  createdAt: string;
  citations?: Array<{
    documentId?: string;
    fileName?: string;
    locator?: string;
    excerpt?: string;
    score?: number;
  }>;
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
