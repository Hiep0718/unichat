import { useState } from 'react';
interface InputProps {
  readonly onSend: (text: string, allowExternalKnowledge: boolean) => void;
  readonly loading: boolean;
  readonly onCancel?: (() => void) | undefined;
}
/** Starts in strict document mode and submits only the supported question length. */
export function ChatInputForm({ onSend, loading, onCancel }: InputProps) {
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (input.trim().length < 3 || loading) return;
    onSend(input.trim(), expanded); setInput('');
  };
  return <div className="chat-input-container"><form onSubmit={submit} className="chat-input-form">
    <button type="button" className="chat-input-form__context-indicator" aria-pressed={expanded}
      disabled={loading} onClick={() => setExpanded((value) => !value)}>
      {expanded ? 'RAG + AI Mở rộng' : 'Chỉ theo Tài liệu'}
    </button>
    <label htmlFor="chat-question" className="sr-only">Câu hỏi tri thức</label>
    <input id="chat-question" className="chat-input-form__field" value={input} onChange={(event) => setInput(event.target.value)}
      minLength={3} maxLength={2000} disabled={loading} placeholder="Nhập câu hỏi tri thức…" />
    <span>{input.length}/2000</span>
    {loading ? <button type="button" onClick={onCancel} disabled={!onCancel}>Dừng</button>
      : <button type="submit" disabled={input.trim().length < 3}>Gửi</button>}
  </form><p>{expanded ? 'Phần kiến thức mở rộng được ghi nhãn riêng; vẫn cần bằng chứng nền từ tài liệu.' : 'Câu trả lời chỉ dùng tài liệu được cấp quyền.'}</p></div>;
}
