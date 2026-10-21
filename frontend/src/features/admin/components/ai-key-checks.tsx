import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAiAdmission, sendQuickPrompt, testProviderKey } from '../admin-api';
import { getSessionSnapshot } from '../../../lib/session-store';
import { friendlyChatError } from '../../chat/chat-failures';
import { isDiagnosticSelectionValid } from './diagnostic-selection';
import type { AiStudioKey, KeyVerifyResponse, QuickPromptResponse } from '../admin-api';
interface Props { keys: AiStudioKey[]; configuredModels: string[]; activeProvider?: string | null }

/** Runs explicit metadata probes and direct admin prompts using the selected stable key. */
export function AiKeyChecks({ keys, configuredModels, activeProvider }: Props) {
  const [selectedKey, setSelectedKey] = useState('');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [probes, setProbes] = useState<Record<string, KeyVerifyResponse>>({});
  const [reply, setReply] = useState<QuickPromptResponse | null>(null);
  const { data: admission, error: admissionError } = useQuery({ queryKey: ['ai-admission', getSessionSnapshot().generation], queryFn: fetchAiAdmission, retry: false });
  const key = keys.find((item) => item.keyId === selectedKey);
  const valid = isDiagnosticSelectionValid(key, model, activeProvider, configuredModels);
  const enabled = valid && admission !== undefined && !admissionError && admission.state !== 'DRAINING' && !busy;
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(null);
    const generation = getSessionSnapshot().generation;
    try { await action(); }
    catch (failure: unknown) { if (generation === getSessionSnapshot().generation) setError(friendlyChatError(failure).message); }
    finally { if (generation === getSessionSnapshot().generation) setBusy(false); }
  };
  const probe = async (keyId: string) => {
    const generation = getSessionSnapshot().generation;
    const result = await testProviderKey(keyId);
    if (generation === getSessionSnapshot().generation) setProbes((previous) => ({ ...previous, [keyId]: result }));
  };
  const generate = async () => {
    const generation = getSessionSnapshot().generation;
    const result = await sendQuickPrompt(prompt, selectedKey, model);
    if (generation === getSessionSnapshot().generation) setReply(result);
  };
  return <section><h3>Kiểm tra nhà cung cấp AI</h3>
    <p>Kiểm tra Hive có thể sinh nội dung và tiêu thụ tín dụng. Kiểm metadata không chứng minh khả năng sinh nội dung.</p>
    {!activeProvider && <p>Chưa có metadata nhà cung cấp đang hoạt động; chỉ có thể xem số liệu.</p>}
    {admissionError && <p role="alert">Không thể đọc trạng thái tiếp nhận; kiểm tra và sinh nội dung đang bị khóa.</p>}
    {keys.length === 0 && <p>UNCONFIGURED — chưa có API key được cấu hình.</p>}
    <label>Khóa kiểm tra <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}><option value="">Chọn API key</option>
      {keys.map((item) => <option key={item.keyId} value={item.keyId}>{item.name} ({item.provider ?? 'chưa rõ'})</option>)}</select></label>
    <label>Mô hình kiểm tra <select value={model} onChange={(event) => setModel(event.target.value)}><option value="">Chọn mô hình</option>
      {configuredModels.map((name) => <option key={name}>{name}</option>)}</select></label>
    {key && <p>{key.name}: {key.maskedKey}</p>}
    <button disabled={!enabled} onClick={() => void run(() => probe(selectedKey))}>Kiểm tra API key</button>
    {probes[selectedKey] && <p>{probes[selectedKey]?.status} · {probes[selectedKey]?.probeType === 'GENERATION' ? 'Sinh nội dung' : 'Metadata'} · {probes[selectedKey]?.latencyMs ?? '—'} ms</p>}
    <h3>Thử sinh nội dung</h3><label>Prompt trực tiếp <textarea value={prompt} maxLength={2000} onChange={(event) => setPrompt(event.target.value)} /></label>
    <button disabled={!enabled || !prompt.trim()} onClick={() => void run(generate)}>Gửi prompt</button>
    {busy && <p role="status">Đang kiểm tra…</p>}{error && <p role="alert">{error}</p>}
    {reply && <div><p>{reply.status} · {reply.tokensUsed ?? '—'} token · {reply.latencyMs ?? '—'} ms</p><p>{reply.reply}</p></div>}
  </section>;
}
