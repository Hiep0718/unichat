import React, { useCallback } from 'react';
import { CitationItem } from '../chat-api';
import './knowledge-studio.css';

export interface SavedNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export type StudioToolType = 'PODCAST' | 'FLASHCARDS' | 'QUIZ' | 'MINDMAP' | 'SLIDES' | 'REPORT';

interface KnowledgeStudioProps {
  workspaceName?: string | undefined;
  citations?: CitationItem[] | undefined;
  selectedCitation?: CitationItem | null | undefined;
  savedNotes?: SavedNote[] | undefined;
  activeTab: 'STUDIO' | 'CITATIONS';
  onTabChange: (tab: 'STUDIO' | 'CITATIONS') => void;
  onSelectCitation?: ((citation: CitationItem) => void) | undefined;
  onSelectTool: (toolType: StudioToolType) => void;
  onSaveNote?: ((title: string, content: string) => void) | undefined;
  onDeleteNote?: ((noteId: string) => void) | undefined;
  onSelectNote?: ((note: SavedNote) => void) | undefined;
  onClosePanel?: (() => void) | undefined;
}

export const KnowledgeStudio: React.FC<KnowledgeStudioProps> = ({
  workspaceName: _workspaceName = 'Kho tri thức',
  citations = [],
  selectedCitation = null,
  savedNotes = [],
  activeTab,
  onTabChange,
  onSelectCitation,
  onSelectTool,
  onDeleteNote,
  onSelectNote,
  onClosePanel,
}) => {
  const handleCopyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <aside className="unichat-studio-panel" aria-label="UniChat AI Knowledge Studio">
      {/* Tabs Navigation & Close Action */}
      <div className="unichat-studio-tabs">
        <div className="unichat-studio-tabs__group">
          <button
            type="button"
            className={`unichat-studio-tab ${activeTab === 'STUDIO' ? 'unichat-studio-tab--active' : ''}`}
            onClick={() => onTabChange('STUDIO')}
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            <span>Studio</span>
          </button>

          <button
            type="button"
            className={`unichat-studio-tab ${activeTab === 'CITATIONS' ? 'unichat-studio-tab--active' : ''}`}
            onClick={() => onTabChange('CITATIONS')}
          >
            <span className="material-symbols-outlined">menu_book</span>
            <span>Trích dẫn ({citations.length})</span>
          </button>
        </div>

        {onClosePanel && (
          <button
            type="button"
            className="unichat-studio-close-btn"
            onClick={onClosePanel}
            title="Đóng Studio"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* TAB 1: STUDIO GENERATOR TOOLS & SAVED NOTES */}
      {activeTab === 'STUDIO' && (
        <div className="unichat-studio-body">
          {/* Action Tool List (UniChat Design Standard) */}
          <div className="unichat-tools-section">
            <div className="unichat-section-title">
              <span className="material-symbols-outlined">handyman</span>
              <span>TẠO SẢN PHẨM TRI THỨC</span>
            </div>

            <div className="unichat-tools-list">
              {/* Podcast Audio Card */}
              <button
                type="button"
                className="unichat-action-row"
                onClick={() => onSelectTool('PODCAST')}
              >
                <div className="unichat-action-row__icon-box unichat-action-row__icon-box--cyan">
                  <span className="material-symbols-outlined">podcasts</span>
                </div>
                <div className="unichat-action-row__text">
                  <div className="unichat-action-row__title">Tổng quan Âm thanh (Podcast)</div>
                  <div className="unichat-action-row__desc">Nghe hội thoại 2 MC tóm tắt tài liệu</div>
                </div>
                <span className="material-symbols-outlined unichat-action-row__chevron">chevron_right</span>
              </button>

              {/* Flashcards Card */}
              <button
                type="button"
                className="unichat-action-row"
                onClick={() => onSelectTool('FLASHCARDS')}
              >
                <div className="unichat-action-row__icon-box unichat-action-row__icon-box--purple">
                  <span className="material-symbols-outlined">style</span>
                </div>
                <div className="unichat-action-row__text">
                  <div className="unichat-action-row__title">Thẻ Ghi Nhớ Khái Niệm</div>
                  <div className="unichat-action-row__desc">Bộ thẻ lật 2 mặt giúp ghi nhớ kiến thức</div>
                </div>
                <span className="material-symbols-outlined unichat-action-row__chevron">chevron_right</span>
              </button>

              {/* Quiz Test Card */}
              <button
                type="button"
                className="unichat-action-row"
                onClick={() => onSelectTool('QUIZ')}
              >
                <div className="unichat-action-row__icon-box unichat-action-row__icon-box--emerald">
                  <span className="material-symbols-outlined">quiz</span>
                </div>
                <div className="unichat-action-row__text">
                  <div className="unichat-action-row__title">Kiểm Tra Trắc Nghiệm</div>
                  <div className="unichat-action-row__desc">Bài test 5 câu có đáp án & giải thích</div>
                </div>
                <span className="material-symbols-outlined unichat-action-row__chevron">chevron_right</span>
              </button>

              {/* Mindmap Card */}
              <button
                type="button"
                className="unichat-action-row"
                onClick={() => onSelectTool('MINDMAP')}
              >
                <div className="unichat-action-row__icon-box unichat-action-row__icon-box--amber">
                  <span className="material-symbols-outlined">schema</span>
                </div>
                <div className="unichat-action-row__text">
                  <div className="unichat-action-row__title">Sơ Đồ Tư Duy (Mindmap)</div>
                  <div className="unichat-action-row__desc">Kết xuất sơ đồ Mermaid trực quan</div>
                </div>
                <span className="material-symbols-outlined unichat-action-row__chevron">chevron_right</span>
              </button>

              {/* Briefing Outline Card */}
              <button
                type="button"
                className="unichat-action-row"
                onClick={() => onSelectTool('SLIDES')}
              >
                <div className="unichat-action-row__icon-box unichat-action-row__icon-box--rose">
                  <span className="material-symbols-outlined">present_to_all</span>
                </div>
                <div className="unichat-action-row__text">
                  <div className="unichat-action-row__title">Kịch Bản Slide Thuyết Trình</div>
                  <div className="unichat-action-row__desc">Tóm tắt cấu trúc slide báo cáo</div>
                </div>
                <span className="material-symbols-outlined unichat-action-row__chevron">chevron_right</span>
              </button>

              {/* Study Guide Card */}
              <button
                type="button"
                className="unichat-action-row"
                onClick={() => onSelectTool('REPORT')}
              >
                <div className="unichat-action-row__icon-box unichat-action-row__icon-box--indigo">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <div className="unichat-action-row__text">
                  <div className="unichat-action-row__title">Báo Cáo Tổng Hợp Tri Thức</div>
                  <div className="unichat-action-row__desc">Báo cáo học thuật chi tiết kèm trích dẫn</div>
                </div>
                <span className="material-symbols-outlined unichat-action-row__chevron">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Saved Notes Pinboard Section */}
          <div className="unichat-notes-section">
            <div className="unichat-section-title">
              <span className="material-symbols-outlined">push_pin</span>
              <span>SỔ GHI CHÚ ({savedNotes.length})</span>
            </div>

            {savedNotes.length === 0 ? (
              <div className="unichat-notes-empty">
                <span className="material-symbols-outlined">bookmark_border</span>
                <p>Chưa có ghi chú nào. Hãy nhấp chọn các công cụ ở trên và bấm <strong>📌 Lưu vào Sổ Ghi Chú</strong> để lưu trữ kết quả.</p>
              </div>
            ) : (
              <div className="unichat-notes-list">
                {savedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="unichat-note-card"
                    onClick={() => onSelectNote?.(note)}
                  >
                    <div className="unichat-note-card__top">
                      <span className="unichat-note-card__title">{note.title}</span>
                      <div className="unichat-note-card__actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="unichat-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(note.content);
                          }}
                          title="Sao chép"
                        >
                          <span className="material-symbols-outlined">content_copy</span>
                        </button>
                        {onDeleteNote && (
                          <button
                            type="button"
                            className="unichat-icon-btn unichat-icon-btn--danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNote(note.id);
                            }}
                            title="Xóa ghi chú"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="unichat-note-card__content">{note.content.substring(0, 160)}...</p>
                    <span className="unichat-note-card__time">{note.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CITATION & RAG SOURCE INSPECTOR */}
      {activeTab === 'CITATIONS' && (
        <div className="unichat-studio-body">
          <div className="unichat-section-title">
            <span className="material-symbols-outlined">verified</span>
            <span>BẰNG CHỨNG & DẪN CHỨNG RAG</span>
          </div>

          {citations.length === 0 ? (
            <div className="unichat-notes-empty">
              <span className="material-symbols-outlined">find_in_page</span>
              <p>Chưa có trích dẫn nào. Hãy gửi câu hỏi hoặc nhấp vào ký hiệu [1], [2] trong tin nhắn AI.</p>
            </div>
          ) : (
            <div className="unichat-citations-list">
              {citations.map((c, idx) => {
                const isSelected = selectedCitation?.citationId === c.citationId || (!selectedCitation && idx === 0);
                return (
                  <div
                    key={c.citationId || idx}
                    className={`unichat-citation-card ${isSelected ? 'unichat-citation-card--selected' : ''}`}
                    onClick={() => onSelectCitation?.(c)}
                  >
                    <div className="unichat-citation-card__top">
                      <span className="unichat-citation-card__badge">[{c.citationId || idx + 1}]</span>
                      <span className="unichat-citation-card__filename" title={c.fileName || c.documentId}>
                        {c.fileName || c.documentId}
                      </span>
                      <span className="unichat-citation-card__score">
                        {Math.round(c.score * 100)}%
                      </span>
                    </div>

                    <div className="unichat-citation-card__locator">
                      <span className="material-symbols-outlined">place</span>
                      <span>{c.locator || 'Trang / Đoạn văn'}</span>
                    </div>

                    <p className="unichat-citation-card__excerpt">"{c.excerpt}"</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
