import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchManifestStatus, repairDocumentManifests } from '../document-api';
import './sync-vector-modal.css';

interface SyncVectorModalProps {
  readonly isOpen: boolean;
  readonly workspaceId: string;
  readonly onClose: () => void;
  readonly onSyncCompleted?: () => void;
}

type RepairState = 'CHECKING' | 'READY' | 'REPAIRING' | 'COMPLETED' | 'ERROR';

/** Queues authorized manifest repair and follows the Core ingestion status. */
export function SyncVectorModal({ isOpen, workspaceId, onClose, onSyncCompleted }: SyncVectorModalProps) {
  const [state, setState] = useState<RepairState>('CHECKING');
  const [missing, setMissing] = useState(0);
  const [queued, setQueued] = useState(0);
  const [failed, setFailed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setState('CHECKING');
    void fetchManifestStatus(workspaceId).then((status) => {
      if (!active) return;
      setMissing(status.missingManifests);
      setFailed(status.failedDocuments);
      setState('READY');
    }).catch((failure: unknown) => {
      if (active) { setError(message(failure)); setState('ERROR'); }
    });
    return () => { active = false; };
  }, [isOpen, workspaceId]);

  useEffect(() => {
    if (!isOpen || state !== 'REPAIRING') return;
    let active = true;
    const poll = async () => {
      try {
        const status = await fetchManifestStatus(workspaceId);
        if (!active) return;
        setMissing(status.missingManifests);
        setFailed(status.failedDocuments);
        if (status.failedDocuments > 0) {
          setError(`${status.failedDocuments} tài liệu gặp lỗi ingestion. Vui lòng kiểm tra danh sách tài liệu.`);
          setState('ERROR');
        } else if (status.missingManifests === 0) { setState('COMPLETED'); onSyncCompleted?.(); }
      } catch (failure: unknown) {
        if (active) { setError(message(failure)); setState('ERROR'); }
      }
    };
    const timer = window.setInterval(() => void poll(), 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isOpen, state, workspaceId, onSyncCompleted]);

  const start = async () => {
    setError(null);
    setState('REPAIRING');
    try {
      const result = await repairDocumentManifests(workspaceId);
      setQueued(result.queuedDocuments);
      if (result.queuedDocuments === 0) setState(failed > 0 ? 'ERROR' : 'COMPLETED');
    } catch (failure: unknown) {
      setError(message(failure)); setState('ERROR');
    }
  };

  if (!isOpen) return null;
  return createPortal(<div className="sync-modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
    <div className="sync-modal" role="dialog" aria-modal="true" aria-label="Sửa manifest tài liệu">
      <div className="modal-header"><h2>Đồng bộ Vector DB</h2>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Đóng">×</button></div>
      <div className="sync-modal__body">
        {state === 'CHECKING' && <p role="status">Đang kiểm tra manifest tài liệu…</p>}
        {state === 'READY' && <><p>{missing === 0 ? 'Không còn tài liệu đã xử lý thiếu manifest.'
          : `${missing} tài liệu đã xử lý cần tạo lại manifest.`}</p>
          {failed > 0 && <p role="alert">{failed} tài liệu đã lỗi ingestion và cần xử lý riêng.</p>}
          <p>Core sẽ gửi các tài liệu này qua luồng ingestion hiện tại và kiểm tra lại số chunk.</p></>}
        {state === 'REPAIRING' && <p role="status">Đã xếp hàng {queued} tài liệu; còn {missing} manifest chưa hoàn tất.</p>}
        {state === 'COMPLETED' && <p role="status">Không còn tài liệu đã xử lý thiếu manifest.</p>}
        {state === 'ERROR' && <p role="alert">{error}</p>}
        <div className="sync-modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Đóng</button>
          {state === 'READY' && missing > 0 && <button type="button" className="btn btn--warning" onClick={() => void start()}>
            Sửa manifest</button>}
          {state === 'ERROR' && missing > 0 && failed === 0 && <button type="button" className="btn btn--warning" onClick={() => void start()}>
            Thử lại</button>}
        </div>
      </div>
    </div>
  </div>, document.body);
}

function message(failure: unknown): string {
  return failure instanceof Error ? failure.message : 'Không thể sửa manifest tài liệu.';
}
