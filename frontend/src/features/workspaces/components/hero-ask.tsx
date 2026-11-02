import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../../../components/icon';

import type { WorkspaceDto } from '../workspace-schema';

interface HeroAskProps {
  readonly workspaces: readonly WorkspaceDto[];
}

/**
 * Ô hỏi nhanh trong dải chào.
 *
 * Mockup vẽ một ô hỏi "trong các workspace của bạn", nhưng Core API chỉ có
 * `/workspaces/{id}/questions` — hỏi xuyên nhiều workspace chưa tồn tại, và
 * dựng nó là việc đụng phân quyền vì phải gom tài liệu được phép từ nhiều
 * nhóm. Nên ô này hỏi trong một nhóm do người dùng chọn: cùng số thao tác,
 * không hứa điều hệ thống chưa làm được.
 */
export function HeroAsk({ workspaces }: HeroAskProps) {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [target, setTarget] = useState(() => workspaces[0]?.id ?? '');

  const chosen = target || workspaces[0]?.id || '';
  const ready = question.trim().length > 0 && chosen !== '';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    navigate(`/workspaces/${chosen}/chat?q=${encodeURIComponent(question.trim())}`);
  };

  if (workspaces.length === 0) {
    return null;
  }

  return (
    <form className="hero-ask" onSubmit={submit}>
      <Icon name="auto_awesome" size={18} className="hero-ask__spark" />

      <input
        type="text"
        className="hero-ask__input"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Hỏi UniChat về tài liệu trong nhóm của bạn..."
        aria-label="Câu hỏi"
      />

      <label className="hero-ask__pick">
        <span className="sr-only">Nhóm để hỏi</span>
        <select
          className="hero-ask__select"
          value={chosen}
          onChange={(event) => setTarget(event.target.value)}
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>
      </label>

      <button type="submit" className="hero-ask__send" disabled={!ready}>
        Hỏi
        <Icon name="arrow_upward" size={16} rounded />
      </button>
    </form>
  );
}
