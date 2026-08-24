import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SavedNote } from './knowledge-studio';
import './saved-note-modal.css';

interface SavedNoteModalProps {
  note: SavedNote;
  onClose: () => void;
  onDeleteNote: (noteId: string) => void;
  onSendToChat?: (promptText: string) => void;
}

export const SavedNoteModal: React.FC<SavedNoteModalProps> = ({
  note,
  onClose,
  onDeleteNote,
  onSendToChat,
}) => {
  const [copiedToast, setCopiedToast] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(note.content);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleAskAI = () => {
    if (onSendToChat) {
      onSendToChat(`Hãy giúp tôi phân tích, tóm tắt và mở rộng các ý chính từ ghi chú này:\n\n---\n**${note.title}**\n${note.content}`);
    }
    onClose();
  };

  return (
    <div className="unichat-saved-note-overlay" onClick={onClose}>
      <div className="unichat-saved-note-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="unichat-saved-note-modal__header">
          <div className="unichat-saved-note-modal__title-group">
            <span className="material-symbols-outlined unichat-saved-note-modal__icon">push_pin</span>
            <div>
              <h3 className="unichat-saved-note-modal__title">{note.title}</h3>
              <span className="unichat-saved-note-modal__time">Đã lưu lúc {note.createdAt}</span>
            </div>
          </div>

          <button type="button" className="unichat-saved-note-modal__close" onClick={onClose} title="Đóng modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {copiedToast && (
          <div className="unichat-saved-note-toast">
            <span className="material-symbols-outlined">check_circle</span>
            <span>Đã sao chép toàn bộ nội dung ghi chú!</span>
          </div>
        )}

        {/* Note Content Viewer */}
        <div className="unichat-saved-note-modal__body">
          <div className="unichat-saved-note-content markdown-body">
            <Markdown remarkPlugins={[remarkGfm]}>
              {note.content}
            </Markdown>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="unichat-saved-note-modal__footer">
          <button
            type="button"
            className="unichat-btn unichat-btn--danger-ghost"
            onClick={() => {
              onDeleteNote(note.id);
              onClose();
            }}
          >
            <span className="material-symbols-outlined">delete</span>
            <span>Xóa ghi chú</span>
          </button>

          <div className="unichat-saved-note-modal__footer-right">
            <button type="button" className="unichat-btn" onClick={handleCopy}>
              <span className="material-symbols-outlined">content_copy</span>
              <span>Sao chép nội dung</span>
            </button>

            {onSendToChat && (
              <button type="button" className="unichat-btn unichat-btn--primary" onClick={handleAskAI}>
                <span className="material-symbols-outlined">chat</span>
                <span>Hỏi AI về Ghi Chú Này</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
