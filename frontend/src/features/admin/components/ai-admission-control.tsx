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
  const { data, error, refetch } = useQuery({
    queryKey: ['ai-admission', getSessionSnapshot().generation],
    queryFn: fetchAiAdmission,
    retry: false,
  });

  const confirm = async () => {
    if (!data || !target) return;
    setBusy(true);
    setNotice(null);
    try {
      await updateAiAdmission(target.state, target.version);
      setTarget(null);
      await refetch();
    } catch (failure: unknown) {
      setTarget(null);
      setNotice(
        failure instanceof ApiError && failure.status === 409
          ? 'Trạng thái đã thay đổi. Đã tải lại; vui lòng kiểm tra trước khi xác nhận lại.'
          : 'Không thể thay đổi trạng thái tiếp nhận. Vui lòng tải lại và thử lại.'
      );
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ai-admission-card" aria-label="Tiếp nhận yêu cầu AI">
      <div className="ai-admission-header">
        <div className="ai-admission-title-wrap">
          <span className="material-symbols-outlined ai-admission-icon" aria-hidden="true">tune</span>
          <h3 className="ai-admission-title">Tiếp nhận yêu cầu AI</h3>
        </div>
        <button
          className="ai-admission-btn-refresh"
          type="button"
          disabled={busy}
          onClick={() => void refetch()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">refresh</span>
          <span>Tải lại trạng thái tiếp nhận</span>
        </button>
      </div>

      {error && (
        <p className="admin-page__error" role="alert">
          Không thể đọc trạng thái tiếp nhận. Vui lòng tải lại trước khi thay đổi.
        </p>
      )}

      {data && (
        <>
          <div className="ai-admission-status-row">
            <div className="ai-admission-badge-group">
              <span className={`ai-admission-badge ai-admission-badge--${data.state.toLowerCase()}`}>
                Trạng thái: {data.state}
              </span>
              <span className="ai-admission-version-pill">Phiên bản: {data.version}</span>
            </div>
            <div className="ai-admission-metrics-info">
              <span>Yêu cầu đang chạy: <strong>{data.runningOperationCount}</strong></span>
              <span>·</span>
              <span>Lượt gọi đang chờ: <strong>{data.pendingAttemptCount}</strong></span>
            </div>
          </div>

          <div className="ai-admission-actions">
            {admissionTransitions(data).map((state) => (
              <button
                key={state}
                className="ai-admission-btn-transition"
                disabled={busy || Boolean(error)}
                onClick={() => setTarget({ state, version: data.version })}
              >
                Chuyển sang {state}
              </button>
            ))}
          </div>

          {target && (
            <div className="ai-admission-dialog" role="alertdialog" aria-label="Xác nhận thay đổi tiếp nhận">
              <p className="ai-admission-dialog__msg">
                {target.state === 'OPEN'
                  ? 'Xác nhận đã kiểm tra dịch vụ và mở lại tiếp nhận yêu cầu AI?'
                  : `Xác nhận chuyển từ ${data.state} sang ${target.state}?`}
              </p>
              <div className="ai-admission-dialog__actions">
                <button
                  className="ai-btn-primary"
                  disabled={busy || Boolean(error)}
                  onClick={() => void confirm()}
                >
                  Xác nhận thay đổi
                </button>
                <button
                  className="ai-btn-secondary"
                  disabled={busy}
                  onClick={() => setTarget(null)}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {notice && <p className="admin-page__notice" role="alert">{notice}</p>}
    </section>
  );
}
