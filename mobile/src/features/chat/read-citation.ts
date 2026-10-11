import { fetchChatOperation } from './chat-transport';
import { chatApi } from './chat-api';
import type { CitationItem } from './chat-types';
import type { MessageItem } from '../../types/api';

/** Opens only fresh canonical provenance after current Core authorization. */
export async function readCurrentCitation(workspaceId: string, message: MessageItem, citation: CitationItem): Promise<CitationItem> {
  if (message.redacted || message.provisional) throw new Error('Nguồn này không còn khả dụng.');
  const result = message.operationId ? (await fetchChatOperation(workspaceId, message.operationId)).result : null;
  const historical = !message.operationId && message.sequence !== undefined
    ? (await chatApi.getMessages(workspaceId, message.conversationId, 0, 1, message.sequence)).content.find((item) => item.id === message.id) : null;
  const source = result ?? historical;
  if (!source || source.redacted) throw new Error('Nguồn này không còn khả dụng.');
  const current = source.citations?.find((item) => item.citationId === citation.citationId && item.documentId === citation.documentId
    && item.chunkId === citation.chunkId && item.contentHash === citation.contentHash);
  if (!current || current.redacted || !current.chunkId || !current.contentHash || current.ingestionVersion === undefined) {
    throw new Error('Không thể xác minh quyền và phiên bản của nguồn trích dẫn.');
  }
  return current;
}
