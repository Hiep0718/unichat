import React from 'react';
import { createPortal } from 'react-dom';
import './pdf-split-modal.css';

export interface PdfSplitModalProps {
  files: File[];
  isProcessing: boolean;
  progressText: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PdfSplitModal: React.FC<PdfSplitModalProps> = ({
  files,
  isProcessing,
  progressText,
  onConfirm,
  onCancel,
}) => {
  const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  return createPortal(
    <div className="pdf-split-overlay" role="dialog" aria-modal="true">
      <div className="pdf-split-modal">
        <div className="pdf-split-modal__header">
          <div className="pdf-split-modal__icon">⚠️</div>
          <div>
            <h4 className="pdf-split-modal__title">Phát hiện tệp vượt quá giới hạn 20 MiB</h4>
            <p className="pdf-split-modal__subtitle">
              Hệ thống tìm thấy {files.length} tệp vượt quá dung lượng quy định. Bạn có thể sử dụng công cụ cắt tự động trên trình duyệt để chia nhỏ tệp trước khi upload.
            </p>
          </div>
        </div>

        <div className="pdf-split-modal__file-list">
          {files.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className="pdf-split-modal__file-item">
              <span className="pdf-split-modal__file-name">{file.name}</span>
              <span className="pdf-split-modal__file-size">{formatMb(file.size)} MB</span>
            </div>
          ))}
        </div>

        <div className="pdf-split-modal__warning-box">
          <h5 className="pdf-split-modal__warning-title">⚠️ Lưu ý tác dụng phụ khi cắt tệp:</h5>
          <ul className="pdf-split-modal__warning-list">
            <li>
              <strong>Đứt đoạn ngữ cảnh (Context Fragmentation):</strong> Các bảng biểu, sơ đồ hoặc đoạn văn vắt qua ranh giới trang cắt có thể bị chia làm 2 phần khi RAG bóc tách vector.
            </li>
            <li>
              <strong>Tiêu tốn hạn ngạch Workspace:</strong> 1 tệp lớn cắt thành nhiều phần nhỏ sẽ chiếm tương ứng số lượng vị trí tài liệu trong hạn ngạch 100 tài liệu/Workspace.
            </li>
            <li>
              <strong>Tên trích dẫn nguồn (Citation Label):</strong> Trích dẫn RAG trong câu trả lời AI sẽ hiển thị tên tệp theo phần (ví dụ: <em>OOP_02_Java_can_ban_Part1.pdf</em>).
            </li>
          </ul>
        </div>

        {isProcessing && progressText && (
          <div className="pdf-split-modal__progress-info">
            <span className="pdf-split-modal__spinner">⏳</span>
            <span>{progressText}</span>
          </div>
        )}

        <div className="pdf-split-modal__actions">
          <button
            type="button"
            className="pdf-split-modal__btn pdf-split-modal__btn--cancel"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Hủy
          </button>
          <button
            type="button"
            className="pdf-split-modal__btn pdf-split-modal__btn--confirm"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Đang bóc tách & cắt tệp...' : 'Tự động cắt & Upload tất cả phần'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
