import { useState } from 'react';
import { CitationPanel } from './citation-panel';
import { RefusalCard } from './refusal-card';
import { ChatMarkdown } from './chat-markdown';
import type { QuestionResponse, CitationItem, SseThoughtPayload } from '../chat-api';

/** View model with canonical response separate from provisional transport text. */
export interface MessageItem {
  id: string; role: 'USER' | 'ASSISTANT'; content: string;
  response?: QuestionResponse | undefined; timestamp?: string | undefined; isStreaming?: boolean | undefined;
  thoughts?: SseThoughtPayload[] | undefined; sequence?: number | undefined; redacted?: boolean | undefined;
}
interface MessageProps {
  readonly message: MessageItem;
  readonly onSelectCitation?: ((citation: CitationItem) => void) | undefined;
  readonly onSelectPrompt?: ((prompt: string) => void) | undefined;
  readonly onSaveNote?: ((title: string, content: string, messageId?: string) => void) | undefined;
  readonly onAskCommunity?: ((message: MessageItem) => void) | undefined;
}

/** Uses public pipeline steps only and never invents reasoning or verification progress. */
function PipelineSteps({ message }: { readonly message: MessageItem }) {
  if (!message.thoughts?.length) return null;
  return <details className="chat-thoughts"><summary>Tiến trình xử lý</summary>
    <ol>{message.thoughts.map((step) => <li key={`${step.stepKey}-${step.stepIndex}`}><strong>{step.title}</strong> — {step.detail}</li>)}</ol>
  </details>;
}

/** Keeps every external expansion visibly separated from document-supported sections. */
function AssistantContent({ message }: { readonly message: MessageItem }) {
  const response = message.response;
  if (message.redacted || response?.redacted) return <p>Nội dung không còn khả dụng do quyền nguồn đã thay đổi.</p>;
  if (response && response.decision !== 'ANSWER') return <RefusalCard decision={response.decision}
    refusalReason={response.refusalReason ?? message.content} refusalCode={response.refusalCode} intent={response.intent} />;
  if (!response?.sections?.length) return <ChatMarkdown content={message.content} provisional={Boolean(message.isStreaming)} />;
  return <>{response.sections.map((section, index) => <section key={index} className={`chat-answer-section--${section.type.toLowerCase()}`}>
    <p><strong>{section.type === 'EXTERNAL' ? 'Kiến thức mở rộng, chưa được tài liệu kiểm chứng' : 'Dựa trên tài liệu được cấp quyền'}</strong></p>
    <ChatMarkdown content={section.content} />
  </section>)}</>;
}

/** Displays provisional labels, canonical sources and actions only for readable final answers. */
export function ChatMessageItem({ message, onSelectCitation, onSaveNote, onAskCommunity }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const final = message.role === 'ASSISTANT' && !message.isStreaming && !message.redacted && !message.response?.redacted;
  const copy = async () => { await navigator.clipboard.writeText(message.content); setCopied(true); };
  return <article className={`chat-msg chat-msg--${message.role.toLowerCase()}`} data-msg-id={message.id}>
    <div className="chat-msg__content">
      <header className="chat-msg__header"><strong>{message.role === 'USER' ? 'Bạn' : 'UniChat AI'}</strong>
        {message.timestamp && <span>{message.timestamp}</span>}</header>
      {message.isStreaming && <p role="status">Câu trả lời tạm thời — đang kiểm tra nguồn và lưu kết quả.</p>}
      <PipelineSteps message={message} />
      <div className="chat-msg__bubble">{message.role === 'USER' ? <p>{message.content}</p> : <AssistantContent message={message} />}</div>
      {final && Boolean(message.response?.citations.length) && <><p>Trích dẫn đã kiểm tra</p>
        <CitationPanel citations={message.response?.citations ?? []} onSelectCitation={onSelectCitation} /></>}
      {final && message.content && <div className="chat-msg__actions">
        <button type="button" onClick={() => void copy()}>{copied ? 'Đã sao chép' : 'Sao chép câu trả lời'}</button>
        {onSaveNote && message.response?.decision === 'ANSWER' && <button type="button"
          onClick={() => onSaveNote('Ghi chú từ chat AI', message.content, message.id)}>Lưu vào Ghi chú</button>}
        {onAskCommunity && <button type="button" onClick={() => onAskCommunity(message)}>Hỏi cộng đồng</button>}
      </div>}
    </div>
  </article>;
}
