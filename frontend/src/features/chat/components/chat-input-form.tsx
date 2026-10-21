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
      {loading ? <button className="chat-input-form__submit-btn" type="button" onClick={onCancel} disabled={!onCancel}>Dừng</button>
        : <button className={`chat-input-form__submit-btn ${input.trim().length >= 3 ? 'chat-input-form__submit-btn--active' : ''}`}
          type="submit" aria-label="Gửi câu hỏi" disabled={disabled || input.trim().length < 3}><Icon name="arrow_upward" size={18} /></button>}
    </div>
    </div>
  </form><p>{expanded ? 'Phần kiến thức mở rộng được ghi nhãn riêng; vẫn cần bằng chứng nền từ tài liệu.' : 'Câu trả lời chỉ dùng tài liệu được cấp quyền.'}</p></div>;
}
