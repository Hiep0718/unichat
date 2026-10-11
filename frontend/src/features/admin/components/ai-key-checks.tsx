import { useState } from 'react';
import { sendQuickPrompt, testGeminiKey } from '../admin-api';
import { getSessionSnapshot } from '../../../lib/session-store';
import type { AiStudioKey, KeyVerifyResponse, QuickPromptResponse } from '../admin-api';
interface Props { keys: AiStudioKey[]; selectedKey: string; model: string }

/** Runs explicit metadata probes and direct admin prompts using the selected stable key. */
export function AiKeyChecks({ keys, selectedKey, model }: Props) {
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [probes, setProbes] = useState<Record<string, KeyVerifyResponse>>({});
  const [reply, setReply] = useState<QuickPromptResponse | null>(null);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(null);
    const generation = getSessionSnapshot().generation;
    try { await action(); }
    catch (failure: unknown) { if (generation === getSessionSnapshot().generation) setError(failure instanceof Error ? failure.message : 'Dịch vụ không khả dụng'); }
    finally { if (generation === getSessionSnapshot().generation) setBusy(false); }
  };
  const probe = async (keyId: string) => {
    const generation = getSessionSnapshot().generation;
    const result = await testGeminiKey(keyId);
    if (generation === getSessionSnapshot().generation) setProbes((previous) => ({ ...previous, [keyId]: result }));
  };
  const generate = async () => {
    const generation = getSessionSnapshot().generation;
    const result = await sendQuickPrompt(prompt, selectedKey, model);
    if (generation === getSessionSnapshot().generation) setReply(result);
  };
  return <section><h3>Kiểm tra API key</h3>{keys.length === 0 && <p>UNCONFIGURED — chưa có API key được cấu hình.</p>}
    {keys.map((key) => <div key={key.keyId}><span>{key.name}: {key.maskedKey} </span>
      <button disabled={busy || !key.isConfigured} onClick={() => void run(() => probe(key.keyId))}>Kiểm metadata {key.name}</button>
      {probes[key.keyId] && <p>{probes[key.keyId]?.status} · Metadata · {probes[key.keyId]?.latencyMs ?? '—'} ms</p>}</div>)}
    <h3>Thử sinh nội dung</h3><label>Prompt trực tiếp <textarea value={prompt} maxLength={2000} onChange={(event) => setPrompt(event.target.value)} /></label>
    <button disabled={busy || !model || !keys.some((key) => key.keyId === selectedKey && key.isConfigured) || !prompt.trim()} onClick={() => void run(generate)}>Gửi prompt</button>
    {busy && <p role="status">Đang kiểm tra…</p>}{error && <p role="alert">{error}</p>}
    {reply && <div><p>{reply.status} · {reply.tokensUsed ?? '—'} token · {reply.latencyMs ?? '—'} ms</p><p>{reply.reply}</p></div>}
  </section>;
}
