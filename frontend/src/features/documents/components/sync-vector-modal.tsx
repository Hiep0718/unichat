import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './sync-vector-modal.css';
import {
  fetchVectorSyncStatus,
  fetchVectorStatusCheck,
  syncVectorStore,
  VectorStatusCheckResponse,
  VectorSyncStatusResponse,
} from '../document-api';

interface SyncVectorModalProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onSyncCompleted?: () => void;
}

export const SyncVectorModal: React.FC<SyncVectorModalProps> = ({
  isOpen,
  workspaceId,
  onClose,
  onSyncCompleted,
}) => {
  const [step, setStep] = useState<'PRECHECK' | 'SYNCING' | 'COMPLETED' | 'ERROR'>('PRECHECK');
  const [preCheck, setPreCheck] = useState<VectorStatusCheckResponse | null>(null);
  const [syncStatus, setSyncStatus] = useState<VectorSyncStatusResponse | null>(null);
  const [loadingPreCheck, setLoadingPreCheck] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingPreCheck(true);

    Promise.all([
      fetchVectorStatusCheck(workspaceId),
      fetchVectorSyncStatus(),
    ])
      .then(([statusRes, syncRes]) => {
        if (!isMounted) return;
        setPreCheck(statusRes);
        setSyncStatus(syncRes);

        if (syncRes.is_syncing) {
          setStep('SYNCING');
        } else {
          setStep('PRECHECK');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(err instanceof Error ? err.message : 'Không thể kiểm tra ChromaDB');
      })
      .finally(() => {
        if (isMounted) setLoadingPreCheck(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, workspaceId]);

  // Polling loop when SYNCING
  useEffect(() => {
    if (!isOpen || step !== 'SYNCING') return;

    const timer = setInterval(() => {
      fetchVectorSyncStatus()
        .then((res) => {
          setSyncStatus(res);
          if (res.status === 'COMPLETED') {
            setStep('COMPLETED');
            onSyncCompleted?.();
          } else if (res.status === 'ERROR') {
            setStep('ERROR');
            setErrorMessage(res.last_error || 'Đồng bộ thất bại');
          }
        })
        .catch(() => {
          // ignore transient poll error
        });
    }, 1200);

    return () => clearInterval(timer);
  }, [isOpen, step, onSyncCompleted]);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    setStep('SYNCING');
    try {
      await syncVectorStore();
    } catch (err: unknown) {
      setStep('ERROR');
      setErrorMessage(err instanceof Error ? err.message : 'Không thể khởi chạy đồng bộ');
    }
  };

  const renderPreCheckStep = () => {
    const chunkCount = preCheck ? (preCheck.workspaceChunksInDb || preCheck.totalChunksInDb) : 0;
    const isReady = Boolean(preCheck?.isVectorDbReady);

    return (
      <div className="sync-modal__body">
        <div className={`sync-modal__status-banner ${isReady ? 'sync-modal__status-banner--ready' : 'sync-modal__status-banner--warning'}`}>
          <span className="material-symbols-outlined sync-modal__banner-icon">
            {isReady ? 'check_circle' : 'warning'}
          </span>
          <div className="sync-modal__banner-text">
            <strong>{isReady ? '🟢 Kho Vector DB đã sẵn sàng' : '🟡 Kho Vector DB chưa có dữ liệu'}</strong>
            <p>Hệ thống hiện có <strong>{chunkCount} chunks</strong> trong Chroma Cloud.</p>
          </div>
        </div>

        <p className="sync-modal__desc">
          {isReady
            ? 'Tài liệu trong Workspace đã được nạp sẵn ma trận Vector. Bạn đã có thể hỏi đáp RAG ngay mà KHÔNG CẦN đồng bộ lại.'
            : 'Hệ thống chưa tìm thấy ma trận Vector cho tài liệu này. Bạn nên thực hiện đồng bộ lại.'}
        </p>

        <div className="sync-modal__warning-box">
          <span className="material-symbols-outlined">info</span>
          <span>
            Lưu ý: Đồng bộ lại sẽ tải và tạo ma trận Vector cho tất cả file trên CPU.
            Quá trình này có thể mất vài phút.
          </span>
        </div>

        <div className="sync-modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Hủy bỏ
          </button>
          <button type="button" className="btn btn--warning" onClick={handleStartSync}>
            {isReady ? 'Vẫn đồng bộ lại' : 'Bắt đầu đồng bộ'}
          </button>
        </div>
      </div>
    );
  };

  const renderSyncingStep = () => {
    const percent = syncStatus?.percent || 0;
    const processedFiles = syncStatus?.processed_files || 0;
    const totalFiles = syncStatus?.total_files || 0;
    const chunks = syncStatus?.processed_chunks || 0;

    return (
      <div className="sync-modal__body">
        <div className="sync-modal__progress-container">
          <div className="sync-modal__progress-header">
            <span>Tiến trình đồng bộ Vector DB</span>
            <span className="sync-modal__percent-text">{percent}%</span>
          </div>

          <div className="sync-modal__progress-bar-bg">
            <div className="sync-modal__progress-bar-fill" style={{ width: `${percent}%` }} />
          </div>

          <div className="sync-modal__meta-grid">
            <div className="sync-modal__meta-item">
              <span className="label">Đã xử lý tệp:</span>
              <span className="val">{processedFiles} / {totalFiles || '?'}</span>
            </div>
            <div className="sync-modal__meta-item">
              <span className="label">Tổng số chunks:</span>
              <span className="val">{chunks} chunks</span>
            </div>
          </div>

          {syncStatus?.current_file && (
            <div className="sync-modal__current-file">
              <span className="material-symbols-outlined spinning">sync</span>
              <span>Đang bóc tách: <code>{syncStatus.current_file}</code></span>
            </div>
          )}
        </div>

        <div className="sync-modal__info-notice">
          ⏳ Vui lòng giữ nguyên màn hình và chờ đồng bộ hoàn tất trước khi mở Hỏi đáp AI.
        </div>
      </div>
    );
  };

  const renderCompletedStep = () => (
    <div className="sync-modal__body text-center">
      <div className="sync-modal__success-icon">
        <span className="material-symbols-outlined">task_alt</span>
      </div>
      <h3>Đồng bộ Vector DB hoàn tất!</h3>
      <p>
        Đã xử lý <strong>{syncStatus?.processed_files || 0} tệp</strong> và tạo tổng cộng{' '}
        <strong>{syncStatus?.processed_chunks || 0} chunks</strong> lưu vào Chroma Cloud.
      </p>
      <div className="sync-modal__footer flex-center">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            onClose();
            onSyncCompleted?.();
          }}
        >
          Hoàn tất & Đóng
        </button>
      </div>
    </div>
  );

  return createPortal(
    <div className="sync-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sync-modal">
        <div className="modal-header">
          <h2>
            <span className="material-symbols-outlined">dataset</span>
            Quản lý Đồng bộ Vector DB (Chroma Cloud)
          </h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Đóng">
            &times;
          </button>
        </div>

        {loadingPreCheck ? (
          <div className="sync-modal__loading">
            <span className="material-symbols-outlined spinning">sync</span>
            <span>Đang kiểm tra trạng thái ChromaDB...</span>
          </div>
        ) : errorMessage ? (
          <div className="sync-modal__body">
            <div className="sync-modal__error-box">
              <span className="material-symbols-outlined">error</span>
              <span>{errorMessage}</span>
            </div>
            <div className="sync-modal__footer">
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                Đóng
              </button>
            </div>
          </div>
        ) : step === 'PRECHECK' ? (
          renderPreCheckStep()
        ) : step === 'SYNCING' ? (
          renderSyncingStep()
        ) : (
          renderCompletedStep()
        )}
      </div>
    </div>,
    document.body
  );
};
