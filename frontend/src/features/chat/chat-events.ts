import { z } from 'zod';
import type { QuestionResponse, StreamQuestionCallbacks } from './chat-types';
import type { SseFrame } from '../../lib/sse-protocol';

const citation = z.object({ documentId: z.string(), citationId: z.string().optional(), chunkId: z.string().optional(),
  ingestionVersion: z.union([z.string(), z.number()]).optional(), contentHash: z.string().optional(),
  fileName: z.string().optional(), locator: z.string(), excerpt: z.string(), score: z.number(), redacted: z.boolean().optional() });
const section = z.object({ type: z.enum(['DOCUMENT', 'EXTERNAL']), content: z.string(),
  claims: z.array(z.object({ text: z.string(), citationIds: z.array(z.string()) })) });
const resultSchema = z.object({ messageId: z.string().min(1), conversationId: z.string().min(1),
  operationId: z.string().min(1), decision: z.enum(['ANSWER', 'CLARIFY', 'REFUSE']),
  answer: z.string().nullable(), intent: z.string(), strategyVersion: z.string(),
  citations: z.array(citation), refusalCode: z.string().nullable(), requestId: z.string(),
  knowledgeMode: z.enum(['STRICT', 'EXPANDED']), sections: z.array(section) }).passthrough();
const tokenSchema = z.object({ delta: z.string(), attemptId: z.string(), sequence: z.number().int().nonnegative() });

/** Enforces final-before-done and rejects out-of-order provisional attempts. */
export class ChatEventReceiver {
  private final: QuestionResponse | null = null;
  private completed = false;
  private attempt: string | null = null;
  private sequence = -1;
  constructor(private readonly callbacks: StreamQuestionCallbacks) {}
  /** Validates and dispatches one public Core event. */
  receive = ({ event, data }: SseFrame): void => {
    if (this.completed) throw new Error('Sự kiện xuất hiện sau khi hoàn tất');
    if (event === 'token') { this.token(data); return; }
    if (event === 'reset') { this.reset(data); return; }
    if (event === 'final') { this.final = resultSchema.parse(data) as QuestionResponse; this.callbacks.onFinal?.(this.final); return; }
    if (event === 'done') { this.done(data); return; }
    if (event === 'metadata') {
      this.callbacks.onMetadata?.(z.object({ operationId: z.string(), conversationId: z.string(),
        knowledgeMode: z.enum(['STRICT', 'EXPANDED']), provisional: z.boolean() }).passthrough().parse(data)); return;
    }
    if (event === 'pipeline-step') {
      this.callbacks.onThought?.(z.object({ stepIndex: z.number(), stepKey: z.string(), title: z.string(), detail: z.string() }).parse(data)); return;
    }
    if (event === 'error') {
      const failure = z.object({ message: z.string().optional(), detail: z.string().optional(), code: z.string().optional() }).parse(data);
      throw new Error(failure.message ?? failure.detail ?? failure.code ?? 'Không thể hoàn tất câu trả lời');
    }
    throw new Error('Sự kiện stream không được hỗ trợ');
  };
  /** Requires server completion rather than fabricating a success at EOF. */
  finish(): void { if (!this.completed) throw new Error('Stream bị gián đoạn. Đang kiểm tra kết quả đã lưu.'); }
  private token(data: unknown): void {
    if (this.final) throw new Error('Token xuất hiện sau câu trả lời cuối');
    const token = tokenSchema.parse(data);
    if (this.attempt !== null && this.attempt !== token.attemptId) throw new Error('Attempt mới thiếu reset');
    if (token.sequence <= this.sequence) throw new Error('Token stream sai thứ tự');
    this.attempt = token.attemptId; this.sequence = token.sequence;
    this.callbacks.onToken?.(token.delta);
  }
  private reset(data: unknown): void {
    if (this.final) throw new Error('Reset xuất hiện sau câu trả lời cuối');
    z.object({ attemptId: z.string() }).parse(data);
    this.attempt = null;
    this.callbacks.onReset?.();
  }
  private done(data: unknown): void {
    const done = z.object({ messageId: z.string(), conversationId: z.string().optional(), operationId: z.string() }).parse(data);
    if (!this.final || done.messageId !== this.final.messageId || done.operationId !== this.final.operationId) {
      throw new Error('Không có kết quả đã lưu khớp sự kiện hoàn tất');
    }
    this.completed = true;
    this.callbacks.onDone?.(done);
  }
}
