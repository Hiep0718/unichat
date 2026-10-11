import { fetchChatOperation } from './chat-api';
import { fetchConversationMessages } from '../history/conversation-api';
import type { CitationItem } from './chat-types';
import type { MessageItem } from './components/chat-message-item';

/** Rechecks the canonical turn before allowing an excerpt stored in UI memory to open. */
export async function readCurrentCitation(workspaceId: string, conversationId: string, message: MessageItem, citation: CitationItem): Promise<CitationItem> {
  if (message.redacted || message.isStreaming) throw new Error('Nguồn này không còn khả dụng.');
  const operationId = message.response?.operationId;
  const result = operationId ? (await fetchChatOperation(workspaceId, operationId)).result : null;
  const historical = !operationId && message.sequence !== undefined
    ? (await fetchConversationMessages(workspaceId, conversationId, 0, 1, message.sequence)).content.find((item) => item.id === message.id) : null;
  const source = result ?? historical;
  if (!source || source.redacted) throw new Error('Nguồn này không còn khả dụng.');
  const current = source.citations?.find((item) => item.citationId === citation.citationId && item.documentId === citation.documentId
    && item.chunkId === citation.chunkId && item.contentHash === citation.contentHash);
  if (!current || current.redacted || !current.chunkId || !current.contentHash || current.ingestionVersion === undefined) {
    throw new Error('Không thể xác minh quyền và phiên bản của nguồn trích dẫn.');
  }
  return current;
}
