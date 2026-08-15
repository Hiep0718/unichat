import { fetchJson } from '../../lib/api-client';

export interface CitationItem {
  citationId?: string | undefined;
  documentId: string;
  fileName?: string | undefined;
  locator: string;
  excerpt: string;
  score: number;
}

export interface QuestionResponse {
  messageId: string;
  conversationId: string;
  decision: 'ANSWER' | 'CLARIFY' | 'REFUSE';
  answer: string | null;
  intent: string;
  strategyVersion: string;
  citations: CitationItem[];
  refusalCode: string | null;
  refusalReason?: string | null | undefined;
  providerModel?: string | null | undefined;
  evidenceScore?: number | null | undefined;
  requestId: string;
}

export interface AskQuestionPayload {
  question: string;
  conversationId?: string | undefined;
}

export async function askWorkspaceQuestion(
  workspaceId: string,
  payload: AskQuestionPayload
): Promise<QuestionResponse> {
  return fetchJson<QuestionResponse>(`/workspaces/${workspaceId}/questions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
