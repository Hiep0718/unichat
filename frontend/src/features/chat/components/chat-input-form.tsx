import { useState } from 'react';
import { Icon } from '../../../components/icon';
interface InputProps {
  readonly onSend: (text: string, allowExternalKnowledge: boolean) => void;
  readonly loading: boolean;
  readonly disabled?: boolean | undefined;
  readonly onCancel?: (() => void) | undefined;
}
/** Starts in strict document mode and submits only the supported question length. */
export function ChatInputForm({ onSend, loading, disabled = false, onCancel }: InputProps) {
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (input.trim().length < 3 || loading || disabled) return;
    onSend(input.trim(), expanded); setInput('');
  };
  const ready = input.trim().length >= 3 && !disabled;
  // The classes the stylesheet has always described. Without them the field,
  // the counter and the send button fell back to browser defaults — a grey
  // full-width bar under a visible "Câu hỏi tri thức", which is the label
  // meant for screen readers alone.
  return <div className="chat-input-container"><form onSubmit={submit} className="chat-input-form">
    <div className="chat-input-form__wrapper">
      <button type="button" className={`chat-input-form__context-indicator chat-input-form__context-indicator--${expanded ? 'hybrid' : 'strict'}`} aria-pressed={expanded}
        disabled={loading || disabled} onClick={() => setExpanded((value) => !value)}>
        <Icon name={expanded ? 'auto_awesome' : 'verified'} size={16} />
        {expanded ? 'RAG + AI Mở rộng' : 'Chỉ theo Tài liệu'}
      </button>
      <label htmlFor="chat-question" className="sr-only">Câu hỏi tri thức</label>
      <input id="chat-question" className="chat-input-form__field" value={input} onChange={(event) => setInput(event.target.value)}
        minLength={3} maxLength={2000} disabled={loading || disabled} placeholder="Nhập câu hỏi tri thức…" />
      <div className="chat-input-form__controls">
        <span className="chat-input-form__counter">{input.length}/2000</span>
        {loading
          ? <button type="button" className="chat-input-form__submit-btn chat-input-form__submit-btn--active"
              onClick={onCancel} disabled={!onCancel}>Dừng</button>
          : <button type="submit" className={`chat-input-form__submit-btn ${ready ? 'chat-input-form__submit-btn--active' : ''}`}
              disabled={!ready}>Gửi</button>}
      </div>
    </div>
    <p className="chat-input-form__note">{expanded ? 'Phần kiến thức mở rộng được ghi nhãn riêng; vẫn cần bằng chứng nền từ tài liệu.' : 'Câu trả lời chỉ dùng tài liệu được cấp quyền.'}</p>
  </form></div>;
}
