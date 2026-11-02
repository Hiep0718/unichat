import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../../../components/icon';
import { KnowledgeModeSwitch } from './knowledge-mode-switch';
import type { KnowledgeMode } from './knowledge-mode-switch';
import './chat-input-form.css';

/** Server-enforced question bounds mirrored in the composer. */
export const QUESTION_MIN_LENGTH = 3;
export const QUESTION_MAX_LENGTH = 2000;
const COUNTER_THRESHOLD = 1600;
const WARNING_THRESHOLD = 1900;
const MAX_FIELD_HEIGHT = 192;

interface InputProps {
  readonly onSend: (text: string, allowExternalKnowledge: boolean) => void;
  readonly loading: boolean;
  readonly disabled?: boolean | undefined;
  readonly onCancel?: (() => void) | undefined;
  readonly workspaceName?: string | undefined;
  readonly readySourceCount?: number | undefined;
  readonly totalSourceCount?: number | undefined;
}

const MODE_NOTE: Record<KnowledgeMode, string> = {
  strict: 'Chỉ trả lời từ tài liệu bạn được cấp quyền, kèm trích dẫn nguồn.',
  expanded: 'Kiến thức mở rộng được gắn nhãn riêng; vẫn cần bằng chứng nền từ tài liệu.',
};

function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, MAX_FIELD_HEIGHT)}px`;
  }, [value]);
  return ref;
}

function buildPlaceholder(workspaceName?: string): string {
  if (workspaceName?.trim()) {
    return `Đặt câu hỏi cho kho "${workspaceName.trim()}" — tra cứu, so sánh hoặc tóm tắt…`;
  }
  return 'Đặt câu hỏi về tài liệu — tra cứu, so sánh hoặc tóm tắt…';
}

function CorpusScopeBadge({ ready, total }: { readonly ready?: number | undefined; readonly total?: number | undefined }) {
  if (total === undefined) return null;
  if (total === 0) {
    return <span className="chat-composer__corpus chat-composer__corpus--empty" title="Workspace hiện chưa có tài liệu để đối chiếu">
      <Icon name="folder_off" size={14} /><span>Chưa có nguồn</span>
    </span>;
  }
  if (ready !== undefined && ready < total) {
    return <span className="chat-composer__corpus chat-composer__corpus--pending" title="Một số tài liệu đang được trích xuất và lập chỉ mục">
      <Icon name="sync" size={14} /><span>{ready}/{total} nguồn sẵn sàng</span>
    </span>;
  }
  const count = ready ?? total;
  return <span className="chat-composer__corpus" title={`Đối chiếu trên ${count} tài liệu bạn được cấp quyền`}>
    <Icon name="library_books" size={14} /><span>{count} nguồn tài liệu</span>
  </span>;
}

/**
 * Context-aware multi-line RAG question composer. Task routing (question, scoped summary or
 * whole-workspace summary) is inferred server-side from natural language rather than hardcoded buttons.
 */
export function ChatInputForm({
  onSend, loading, disabled = false, onCancel, workspaceName, readySourceCount, totalSourceCount,
}: InputProps) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<KnowledgeMode>('strict');
  const field = useAutoResize(input);
  const trimmedLength = input.trim().length;
  const canSend = !loading && !disabled && trimmedLength >= QUESTION_MIN_LENGTH;
  const submit = () => {
    if (!canSend) return;
    onSend(input.trim(), mode === 'expanded'); setInput('');
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault(); submit();
  };
  const counterTone = input.length >= QUESTION_MAX_LENGTH ? ' chat-composer__counter--limit'
    : input.length >= WARNING_THRESHOLD ? ' chat-composer__counter--warn' : '';
  return <div className="chat-input-container">
    <form className={`chat-composer chat-composer--${mode}${disabled ? ' chat-composer--disabled' : ''}`}
      onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <label htmlFor="chat-question" className="sr-only">Câu hỏi tri thức</label>
      <textarea id="chat-question" ref={field} rows={1} className="chat-composer__field" value={input}
        onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} disabled={disabled}
        maxLength={QUESTION_MAX_LENGTH} aria-describedby="chat-composer-note" placeholder={buildPlaceholder(workspaceName)} />
      <div className="chat-composer__toolbar">
        <div className="chat-composer__context">
          <KnowledgeModeSwitch value={mode} onChange={setMode} disabled={disabled} />
          <CorpusScopeBadge ready={readySourceCount} total={totalSourceCount} />
        </div>
        <div className="chat-composer__actions">
          {trimmedLength > 0 && trimmedLength < QUESTION_MIN_LENGTH && (
            <span className="chat-composer__hint" aria-live="polite">Tối thiểu {QUESTION_MIN_LENGTH} ký tự</span>
          )}
          {input.length >= COUNTER_THRESHOLD && <span aria-live="polite" className={`chat-composer__counter${counterTone}`}>
            {input.length.toLocaleString('vi-VN')}/{QUESTION_MAX_LENGTH.toLocaleString('vi-VN')}</span>}
          {loading
            ? <button type="button" className="chat-composer__send chat-composer__send--stop" onClick={onCancel}
              disabled={!onCancel} aria-label="Dừng tạo câu trả lời" title="Dừng tạo câu trả lời">
              <Icon name="stop" size={16} filled /><span>Dừng</span></button>
            : <button type="submit" className="chat-composer__send" disabled={!canSend}
              aria-label="Gửi câu hỏi" title="Gửi câu hỏi (Enter)"><Icon name="arrow_upward" size={18} /></button>}
        </div>
      </div>
    </form>
    <p id="chat-composer-note" className="chat-composer__note">
      <Icon name={mode === 'expanded' ? 'auto_awesome' : 'verified_user'} size={13} />
      <span>{MODE_NOTE[mode]}</span>
      <span className="chat-composer__shortcut"><kbd>Enter</kbd> gửi · <kbd>Shift</kbd> + <kbd>Enter</kbd> xuống dòng</span>
    </p>
  </div>;
}
