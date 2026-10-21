import { useState } from 'react';
import { Icon } from '../../../components/icon';
import aiAvatar from '../../../assets/ai-avatar.png';
import { CitationPanel } from './citation-panel';
import { RefusalCard } from './refusal-card';
import { ChatMarkdown } from './chat-markdown';
import { canAskCommunity } from '../chat-refusal-policy';
import type { QuestionResponse, CitationItem, SseThoughtPayload } from '../chat-api';
import './chat-message-item.css';

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
  return <details className="chat-thoughts">
    <summary className="chat-thoughts__header">
      <span className="chat-thoughts__header-left">
        <span className="chat-thoughts__header-title"><Icon name="account_tree" size={16} />Tiến trình xử lý</span>
        <span className="chat-thoughts__status-badge">{message.thoughts.length} bước</span>
      </span>
      <Icon name="expand_more" size={18} className="chat-thoughts__toggle-icon" />
    </summary>
    <ol className="chat-thoughts__body">{message.thoughts.map((step) =>
      <li className="chat-thoughts__step" key={`${step.stepKey}-${step.stepIndex}`}>
        <span className="chat-thoughts__step-node" aria-hidden="true">{step.stepIndex}</span>
        <span className="chat-thoughts__step-content">
          <strong className="chat-thoughts__step-title">{step.title}</strong>
          <span className="chat-thoughts__step-detail">{step.detail}</span>
        </span>
      </li>)}</ol>
  </details>;
}

/** Keeps every external expansion visibly separated from document-supported sections. */
function AssistantContent({ message }: { readonly message: MessageItem }) {
  const response = message.response;
  if (message.redacted || response?.redacted) return <p>Nội dung không còn khả dụng do quyền nguồn đã thay đổi.</p>;
  if (response && response.decision !== 'ANSWER') return <RefusalCard decision={response.decision}
    refusalReason={response.refusalReason ?? message.content} refusalCode={response.refusalCode} intent={response.intent} />;
  if (!response?.sections?.length) return <div className="chat-msg__markdown">
    <ChatMarkdown content={message.content} provisional={Boolean(message.isStreaming)} />
    {message.isStreaming && Boolean(message.content) && <span className="chat-msg__streaming-cursor" aria-hidden="true">▍</span>}
  </div>;
  return <div className="chat-msg__markdown">{response.sections.map((section, index) =>
    <section key={index} className={`chat-answer-section--${section.type.toLowerCase()}`}>
    <p><strong>{section.type === 'EXTERNAL' ? 'Kiến thức mở rộng, chưa được tài liệu kiểm chứng' : 'Dựa trên tài liệu được cấp quyền'}</strong></p>
    <ChatMarkdown content={section.content} />
  </section>)}</div>;
}

function MessageActions({ message, onSaveNote, onAskCommunity }: Pick<MessageProps, 'message' | 'onSaveNote' | 'onAskCommunity'>) {
  const [copied, setCopied] = useState(false);
  const final = message.role === 'ASSISTANT' && !message.isStreaming && !message.redacted && !message.response?.redacted;
  const copy = async () => { await navigator.clipboard.writeText(message.content); setCopied(true); };
  if (!final || !message.content) return null;
  return <div className="chat-msg__actions">
    <button className={`chat-msg__action-btn ${copied ? 'chat-msg__action-btn--active' : ''}`} type="button" onClick={() => void copy()}>
      <Icon name={copied ? 'check' : 'content_copy'} size={16} />{copied ? 'Đã sao chép' : 'Sao chép câu trả lời'}
    </button>
    {onSaveNote && message.response?.decision === 'ANSWER' && <button className="chat-msg__action-btn" type="button"
      onClick={() => onSaveNote('Ghi chú từ chat AI', message.content, message.id)}>
      <Icon name="bookmark_add" size={16} />Lưu vào Ghi chú
    </button>}
    {onAskCommunity && canAskCommunity(message.response) && <button className="chat-msg__action-btn" type="button" onClick={() => onAskCommunity(message)}>
      <Icon name="forum" size={16} />Hỏi cộng đồng
    </button>}
  </div>;
}

/** Displays provisional labels, canonical sources and actions only for readable final answers. */
export function ChatMessageItem({ message, onSelectCitation, onSaveNote, onAskCommunity }: MessageProps) {
  const isThinking = message.role === 'ASSISTANT' && message.isStreaming && !message.content && !message.response;

  return <article className={`chat-msg chat-msg--${message.role.toLowerCase()}`} data-msg-id={message.id}>
    <div className="chat-msg__avatar" aria-hidden="true">{message.role === 'USER'
      ? <Icon name="person" size={20} /> : <img className="chat-msg__ai-avatar-img" src={aiAvatar} alt="" />}</div>
    <div className="chat-msg__content chat-msg__content-zone">
      <header className="chat-msg__header"><strong className="chat-msg__author">{message.role === 'USER' ? 'Bạn' : 'UniChat AI'}</strong>
        {message.role === 'ASSISTANT' && !message.redacted && !message.response?.redacted && message.response?.providerModel
          && <span className="chat-msg__model">{message.response.providerModel}</span>}
        {message.timestamp && <span className="chat-msg__time">{message.timestamp}</span>}</header>
      <PipelineSteps message={message} />
      {isThinking ? (
        <div className="chat-msg__bubble chat-msg__bubble--thinking" role="status">
          <div className="chat-msg__thinking-dots">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
          <span className="chat-msg__thinking-text">UniChat AI đang suy nghĩ…</span>
        </div>
      ) : (
        <div className="chat-msg__bubble">
          {message.role === 'USER' ? <p>{message.content}</p> : <AssistantContent message={message} />}
        </div>
      )}
      {message.isStreaming && Boolean(message.content) && (
        <p className="chat-msg__streaming-status" role="status">
          Câu trả lời tạm thời — đang kiểm tra nguồn và lưu kết quả.
        </p>
      )}
      {message.role === 'ASSISTANT' && !message.isStreaming && !message.redacted && !message.response?.redacted
        && Boolean(message.response?.citations.length) && <CitationPanel
          citations={message.response?.citations ?? []} onSelectCitation={onSelectCitation} />}
      <MessageActions message={message} onSaveNote={onSaveNote} onAskCommunity={onAskCommunity} />
    </div>
  </article>;
}
