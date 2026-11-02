import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import './document-delete-modal.css';

interface DocumentDeleteModalProps {
  readonly documentName: string;
  readonly isDeleting: boolean;
  readonly error: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/** Confirms deletion of one selected document by requiring its exact name. */
export function DocumentDeleteModal({
  documentName,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: DocumentDeleteModalProps) {
  const [confirmation, setConfirmation] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const canDelete = confirmation === documentName && !isDeleting;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isDeleting) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting, onCancel]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canDelete) onConfirm();
  };

  return createPortal(
    <div
      className="document-delete-modal__overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onCancel();
      }}
    >
      <form
        className="document-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-delete-title"
        aria-describedby="document-delete-description"
        onSubmit={handleSubmit}
      >
        <h2 id="document-delete-title" className="document-delete-modal__title">
          Xác nhận xóa tài liệu
        </h2>
        <p id="document-delete-description" className="document-delete-modal__description">
          Hành động này không thể hoàn tác. Nhập chính xác tên tài liệu để xác nhận xóa:
        </p>
        <p className="document-delete-modal__file-name" title={documentName}>
          {documentName}
        </p>
        <label className="document-delete-modal__label" htmlFor="document-delete-confirmation">
          Tên tài liệu
        </label>
        <input
          ref={inputRef}
          id="document-delete-confirmation"
          className="document-delete-modal__input"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          disabled={isDeleting}
        />
        {error && (
          <p className="document-delete-modal__error" role="alert">
            {error}
          </p>
        )}
        <div className="document-delete-modal__actions">
          <button
            className="document-delete-modal__cancel"
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Hủy
          </button>
          <button
            className="document-delete-modal__confirm"
            type="submit"
            disabled={!canDelete}
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa tài liệu'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
