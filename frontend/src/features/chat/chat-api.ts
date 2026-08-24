import { fetchJson, getAccessToken } from '../../lib/api-client';

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
  allowExternalKnowledge?: boolean | undefined;
}

export interface SseMetadataPayload {
  conversationId?: string | undefined;
  decision?: 'ANSWER' | 'CLARIFY' | 'REFUSE' | undefined;
  intent?: string | undefined;
  strategyVersion?: string | undefined;
  citations?: CitationItem[] | undefined;
  refusalCode?: string | null | undefined;
  refusalReason?: string | null | undefined;
  providerModel?: string | undefined;
  evidenceScore?: number | null | undefined;
  requestId?: string | undefined;
}

export interface SseDonePayload {
  messageId: string;
  conversationId?: string | undefined;
  refusalCode?: string | null | undefined;
  providerModel?: string | undefined;
}

export interface SseThoughtPayload {
  stepIndex: number;
  stepKey: string;
  title: string;
  detail: string;
}

export interface StreamQuestionCallbacks {
  onMetadata?: ((metadata: SseMetadataPayload) => void) | undefined;
  onThought?: ((thought: SseThoughtPayload) => void) | undefined;
  onToken?: ((delta: string) => void) | undefined;
  onDone?: ((done: SseDonePayload) => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
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

export async function askWorkspaceQuestionStream(
  workspaceId: string,
  payload: AskQuestionPayload,
  callbacks: StreamQuestionCallbacks
): Promise<void> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/v1/workspaces/${workspaceId}/questions/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = 'Lỗi kết nối stream AI';
    try {
      const errJson = await response.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (!response.body) {
    throw new Error('Stream response body is empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let currentEvent = '';
  let hasEmittedDone = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.substring(6).trim();
        } else if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.substring(5).trim();
          if (!dataStr) continue;

          try {
            const dataObj = JSON.parse(dataStr);
            if (currentEvent === 'metadata') {
              callbacks.onMetadata?.(dataObj);
            } else if (currentEvent === 'thought') {
              callbacks.onThought?.(dataObj);
            } else if (currentEvent === 'token') {
              callbacks.onToken?.(dataObj.delta || '');
            } else if (currentEvent === 'done') {
              hasEmittedDone = true;
              callbacks.onDone?.(dataObj);
            }
          } catch (e) {
            console.debug('Failed parsing SSE data JSON:', e);
          }
          currentEvent = '';
        }
      }
    }

    if (!hasEmittedDone) {
      callbacks.onDone?.({ messageId: 'done' });
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    callbacks.onError?.(error);
    throw error;
  }
}

