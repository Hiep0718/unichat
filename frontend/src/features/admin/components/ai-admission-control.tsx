import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api-error';
import { getSessionSnapshot } from '../../../lib/session-store';
import { fetchAiAdmission, updateAiAdmission } from '../admin-api';
import { admissionTransitions } from './ai-admission-policy';
import type { AiAdmission } from '../admin-api';

/** Requires operator confirmation for every admission transition and refreshes stale versions. */
export function AiAdmissionControl() {
  const [target, setTarget] = useState<{ state: AiAdmission['state']; version: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { data, error, refetch } = useQuery({ queryKey: ['ai-admission', getSessionSnapshot().generation],
    queryFn: fetchAiAdmission, retry: false });
  const confirm = async () => {
    if (!data || !target) return;
    setBusy(true); setNotice(null);
    try { await updateAiAdmission(target.state, target.version); setTarget(null); await refetch(); }
    catch (failure: unknown) {
      setTarget(null);
      setNotice(failure instanceof ApiError && failure.status === 409
        ? 'Trạng thái đã thay đổi. Đã tải lại; vui lòng kiểm tra trước khi xác nhận lại.'
        : 'Không thể thay đổi trạng thái tiếp nhận. Vui lòng tải lại và thử lại.');
      await refetch();
    } finally { setBusy(false); }
  };
  return <section aria-label="Tiếp nhận yêu cầu AI"><h3>Tiếp nhận yêu cầu AI</h3>
    {error && <p role="alert">Không thể đọc trạng thái tiếp nhận. Vui lòng tải lại trước khi thay đổi.</p>}
    {data && <><p>Trạng thái: {data.state} · Phiên bản: {data.version}</p>
      <p>Yêu cầu đang chạy: {data.runningOperationCount} · Lượt gọi đang chờ: {data.pendingAttemptCount}</p>
      {admissionTransitions(data).map((state) => <button key={state} disabled={busy || Boolean(error)} onClick={() => setTarget({ state, version: data.version })}>Chuyển sang {state}</button>)}
      {target && <div role="alertdialog" aria-label="Xác nhận thay đổi tiếp nhận"><p>
        {target.state === 'OPEN' ? 'Xác nhận đã kiểm tra dịch vụ và mở lại tiếp nhận yêu cầu AI?' : `Xác nhận chuyển từ ${data.state} sang ${target.state}?`}
      </p><button disabled={busy || Boolean(error)} onClick={() => void confirm()}>Xác nhận thay đổi</button>
        <button disabled={busy} onClick={() => setTarget(null)}>Hủy</button></div>}</>}
    {notice && <p role="alert">{notice}</p>}
    <button disabled={busy} onClick={() => void refetch()}>Tải lại trạng thái tiếp nhận</button>
  </section>;
}
