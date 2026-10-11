/** Server-provided source provenance; legacy entries may omit new metadata. */
export interface CitationItem {
  citationId?: string | undefined;
  documentId: string;
  chunkId?: string | undefined;
  ingestionVersion?: number | string | undefined;
  contentHash?: string | undefined;
  fileName?: string | undefined;
  locator: string;
  excerpt: string;
  score: number;
  redacted?: boolean | undefined;
}
/** Separates documented facts from explicitly labeled external expansion. */
export interface AnswerSection {
  readonly type: 'DOCUMENT' | 'EXTERNAL';
  readonly content: string;
  readonly claims: ReadonlyArray<{ readonly text: string; readonly citationIds: readonly string[] }>;
}
/** Canonical persisted result; provisional text never constitutes this response. */
export interface QuestionResponse {
  messageId: string; conversationId: string; operationId?: string | undefined;
  decision: 'ANSWER' | 'CLARIFY' | 'REFUSE'; answer: string | null;
  intent: string; strategyVersion: string; citations: CitationItem[];
  knowledgeMode?: 'STRICT' | 'EXPANDED' | undefined;
  sections?: AnswerSection[] | undefined;
  refusalCode: string | null; refusalReason?: string | null | undefined;
  providerModel?: string | null | undefined; evidenceScore?: number | null | undefined;
  singleSourceWarning?: boolean | undefined; warningMessage?: string | null | undefined;
  requestId: string; redacted?: boolean | undefined;
}
/** Immutable original request binding, excluding a subsequently created conversation ID. */
export interface AskQuestionPayload {
  question: string; conversationId?: string | undefined; allowExternalKnowledge?: boolean | undefined;
}
/** Owner-only operation status used after transport interruption. */
export interface ChatOperation {
  readonly operationId: string; readonly conversationId: string | null;
  readonly state: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  readonly result: QuestionResponse | null; readonly errorCode: string | null;
}
export interface SseMetadataPayload {
  operationId?: string | undefined; conversationId?: string | undefined;
  knowledgeMode?: 'STRICT' | 'EXPANDED' | undefined; provisional?: boolean | undefined;
  decision?: QuestionResponse['decision'] | undefined; intent?: string | undefined;
  strategyVersion?: string | undefined; citations?: CitationItem[] | undefined;
  refusalCode?: string | null | undefined; refusalReason?: string | null | undefined;
  providerModel?: string | undefined; evidenceScore?: number | null | undefined;
  singleSourceWarning?: boolean | undefined; warningMessage?: string | null | undefined; requestId?: string | undefined;
}
export interface SseDonePayload {
  messageId: string; conversationId?: string | undefined; operationId?: string | undefined;
  refusalCode?: string | null | undefined; providerModel?: string | undefined;
}
export interface SseThoughtPayload { stepIndex: number; stepKey: string; title: string; detail: string }
export interface StreamQuestionCallbacks {
  onMetadata?: ((metadata: SseMetadataPayload) => void) | undefined;
  onThought?: ((thought: SseThoughtPayload) => void) | undefined;
  onToken?: ((delta: string) => void) | undefined;
  onReset?: (() => void) | undefined;
  onFinal?: ((result: QuestionResponse) => void) | undefined;
  onDone?: ((done: SseDonePayload) => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
}
/** Transport identity retained for retries, detach and cancellation. */
export interface ChatRequestOptions { readonly idempotencyKey?: string | undefined; readonly signal?: AbortSignal | undefined }
