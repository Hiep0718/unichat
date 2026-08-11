import React from 'react';

interface ChatHeaderProps {
  workspaceName?: string | undefined;
  conversationTitle?: string | undefined;
  messageCount: number;
  onNewChat?: (() => void) | undefined;
  onToggleDrawer?: (() => void) | undefined;
  hasDrawerOpen?: boolean | undefined;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  workspaceName,
  conversationTitle,
  messageCount,
  onNewChat,
  onToggleDrawer,
  hasDrawerOpen,
}) => {
  return (
    <header className="chat-header">
      <div className="chat-header__main">
        <div className="chat-header__icon-badge">
          <span className="material-symbols-outlined">auto_awesome</span>
        </div>
        <div className="chat-header__titles">
          <div className="chat-header__breadcrumb">
            <span className="chat-header__workspace">{workspaceName || 'Workspace'}</span>
            <span className="chat-header__sep">/</span>
            <span className="chat-header__session-tag">Trợ lý RAG AI</span>
          </div>
          <h3 className="chat-header__title" title={conversationTitle || 'Cuộc trò chuyện mới'}>
            {conversationTitle || 'Cuộc trò chuyện tri thức mới'}
          </h3>
        </div>
      </div>

      <div className="chat-header__actions">
        <div className="chat-header__info-pill" title="Mô hình AI & Phiên làm việc">
          <span className="material-symbols-outlined">psychology</span>
          <span>Gemini 2.5 Flash</span>
        </div>
        
        <div className="chat-header__info-pill" title="Tổng số tin nhắn trong phiên">
          <span className="material-symbols-outlined">forum</span>
          <span>{messageCount} tin nhắn</span>
        </div>

        <button
          type="button"
          className="chat-header__btn chat-header__btn--primary"
          onClick={onNewChat}
          title="Tạo cuộc trò chuyện mới"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Hội thoại mới</span>
        </button>

        {onToggleDrawer && (
          <button
            type="button"
            className={`chat-header__btn ${hasDrawerOpen ? 'chat-header__btn--active' : 'chat-header__btn--icon'}`}
            onClick={onToggleDrawer}
            title="Đóng/Mở bảng tài liệu xem chi tiết"
          >
            <span className="material-symbols-outlined">description</span>
          </button>
        )}
      </div>
    </header>
  );
};
