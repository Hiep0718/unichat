import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAiAdmission, sendQuickPrompt, testProviderKey } from '../admin-api';
import { getSessionSnapshot } from '../../../lib/session-store';
import { friendlyChatError } from '../../chat/chat-failures';
import { isDiagnosticSelectionValid } from './diagnostic-selection';
import type { AiStudioKey, KeyVerifyResponse, QuickPromptResponse } from '../admin-api';

interface Props {
  readonly keys: readonly AiStudioKey[];
  readonly configuredModels: readonly string[];
  readonly activeProvider?: string | null;
}

/** Runs explicit metadata probes and direct admin prompts using the selected stable key. */
export function AiKeyChecks({ keys, configuredModels, activeProvider }: Props) {
  const [selectedKey, setSelectedKey] = useState('');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [probes, setProbes] = useState<Record<string, KeyVerifyResponse>>({});
  const [reply, setReply] = useState<QuickPromptResponse | null>(null);

  const { data: admission, error: admissionError } = useQuery({
    queryKey: ['ai-admission', getSessionSnapshot().generation],
    queryFn: fetchAiAdmission,
    retry: false,
  });

  const key = keys.find((item) => item.keyId === selectedKey);
  const valid = isDiagnosticSelectionValid(key, model, activeProvider, configuredModels);
  const enabled = valid && admission !== undefined && !admissionError && admission.state !== 'DRAINING' && !busy;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    const generation = getSessionSnapshot().generation;
    try {
      await action();
    } catch (failure: unknown) {
      if (generation === getSessionSnapshot().generation) setError(friendlyChatError(failure).message);
    } finally {
      if (generation === getSessionSnapshot().generation) setBusy(false);
    }
  };

  const probe = async (keyId: string) => {
    const generation = getSessionSnapshot().generation;
    const result = await testProviderKey(keyId);
    if (generation === getSessionSnapshot().generation) {
      setProbes((previous) => ({ ...previous, [keyId]: result }));
    }
  };

  const generate = async () => {
    const generation = getSessionSnapshot().generation;
    const result = await sendQuickPrompt(prompt, selectedKey, model);
    if (generation === getSessionSnapshot().generation) setReply(result);
  };

  return (
    <section className="ai-key-checks-card" aria-label="Kiểm tra nhà cung cấp AI">
      <div className="ai-card-header">
        <span className="material-symbols-outlined ai-card-icon" aria-hidden="true">vpn_key</span>
        <h3>Kiểm tra nhà cung cấp AI</h3>
      </div>
      <p className="ai-card-desc">
        Kiểm tra sinh nội dung có thể tiêu thụ tín dụng. Kiểm metadata không chứng minh khả năng sinh nội dung.
      </p>

      {!activeProvider && (
        <p className="admin-page__notice" role="status">
          Chưa có metadata nhà cung cấp đang hoạt động; chỉ có thể xem số liệu.
        </p>
      )}

      {admissionError && (
        <p className="admin-page__error" role="alert">
          Không thể đọc trạng thái tiếp nhận; kiểm tra và sinh nội dung đang bị khóa.
        </p>
      )}

      {keys.length === 0 && <p className="admin-page__notice">UNCONFIGURED — chưa có API key được cấu hình.</p>}

      <div className="ai-form-grid">
        <label className="ai-form-field">
          Khóa kiểm tra
          <select
            className="ai-studio-filter-select"
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
          >
            <option value="">Chọn API key</option>
            {keys.map((item) => (
              <option key={item.keyId} value={item.keyId}>
                {item.name} ({item.provider ?? 'chưa rõ'})
              </option>
            ))}
          </select>
        </label>

        <label className="ai-form-field">
          Mô hình kiểm tra
          <select
            className="ai-studio-filter-select"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          >
            <option value="">Chọn mô hình</option>
            {configuredModels.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      {key && (
        <div className="ai-key-info-badge">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>key</span>
          <span>
            <strong>{key.name}:</strong> <code>{key.maskedKey}</code>
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          className="ai-btn-primary"
          disabled={!enabled}
          onClick={() => void run(() => probe(selectedKey))}
        >
          Kiểm tra API key
        </button>

        {probes[selectedKey] && (
          <div className="ai-probe-result-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>verified</span>
            <span>
              {probes[selectedKey]?.status} ·{' '}
              {probes[selectedKey]?.probeType === 'GENERATION' ? 'Sinh nội dung' : 'Metadata'} ·{' '}
              {probes[selectedKey]?.latencyMs ?? '—'} ms
            </span>
          </div>
        )}
      </div>

      <div className="ai-prompt-sandbox">
        <h4>Thử sinh nội dung</h4>
        <label className="ai-form-field">
          Prompt trực tiếp
          <textarea
            className="ai-prompt-textarea"
            value={prompt}
            maxLength={2000}
            placeholder="Nhập câu lệnh để kiểm tra phản hồi từ nhà cung cấp đã chọn..."
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <div>
          <button
            className="ai-btn-primary"
            disabled={!enabled || !prompt.trim()}
            onClick={() => void run(generate)}
          >
            Gửi prompt
          </button>
        </div>

        {busy && <p className="admin-page__notice" role="status">Đang kiểm tra…</p>}
        {error && <p className="admin-page__error" role="alert">{error}</p>}

        {reply && (
          <div className="ai-prompt-reply-box">
            <div className="ai-prompt-reply-meta">
              {reply.status} · {reply.tokensUsed ?? '—'} token · {reply.latencyMs ?? '—'} ms
            </div>
            <div className="ai-prompt-reply-content">{reply.reply}</div>
          </div>
        )}
      </div>
    </section>
  );
}
