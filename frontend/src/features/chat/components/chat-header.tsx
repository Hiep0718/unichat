import { Link } from 'react-router-dom';
import aiAvatar from '../../../assets/ai-avatar.png';

interface ChatHeaderProps {
  workspaceId?: string | undefined;
  workspaceName?: string | undefined;
  conversationTitle?: string | undefined;
  messageCount: number;
  onNewChat?: (() => void) | undefined;
  onToggleDrawer?: (() => void) | undefined;
  hasDrawerOpen?: boolean | undefined;
  onToggleStudio?: (() => void) | undefined;
  isStudioOpen?: boolean | undefined;
}

function ChatIdentity({
  workspaceId,
  workspaceName,
  conversationTitle,
}: ChatHeaderProps) {
  return (
      <div className="chat-header__main">
        {workspaceId && (
          <Link
            to={`/workspaces/${workspaceId}`}
            className="chat-header__back-btn"
            title={`Quay lại trang nhóm ${workspaceName || ''}`}
            aria-label="Quay lại trang nhóm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              arrow_back
            </span>
          </Link>
        )}
        <div className="chat-header__icon-badge">
          <img src={aiAvatar} alt="AI Avatar" className="chat-header__ai-avatar-img" />
        </div>
        <div className="chat-header__titles">
          <div className="chat-header__breadcrumb">
            {workspaceId ? (
              <Link to={`/workspaces/${workspaceId}`} className="chat-header__workspace chat-header__workspace-link">
                {workspaceName || 'Workspace'}
              </Link>
            ) : (
              <span className="chat-header__workspace">{workspaceName || 'Workspace'}</span>
            )}
            <span className="chat-header__sep">/</span>
            <span className="chat-header__session-tag">Trợ lý RAG AI</span>
          </div>
          <h3 className="chat-header__title" title={conversationTitle || 'Cuộc trò chuyện mới'}>
            {conversationTitle || 'Cuộc trò chuyện tri thức mới'}
          </h3>
        </div>
      </div>
  );
}

function ChatActions({ messageCount, onNewChat, onToggleDrawer, hasDrawerOpen, onToggleStudio, isStudioOpen }: ChatHeaderProps) {
  return (
      <div className="chat-header__actions">
        <div className="chat-header__info-pill" title="Mô hình thực được ghi trên từng câu trả lời đã lưu">
          <span className="material-symbols-outlined">psychology</span>
          <span>Trợ lý AI</span>
        </div>

        <div className="chat-header__info-pill" title="Tổng số tin nhắn trong phiên">
          <span className="material-symbols-outlined">forum</span>
          <span>{messageCount} tin nhắn</span>
        </div>

        {onToggleStudio && <button type="button"
          className={`chat-header__btn ${isStudioOpen ? 'chat-header__btn--active' : ''}`}
          onClick={onToggleStudio} title="Đóng/Mở NotebookLM Knowledge Studio"
          style={{ background: isStudioOpen ? '#0284c7' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff', fontWeight: 600, gap: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span><span>Studio</span>
        </button>}

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
  );
}

/** Keeps the header neutral; persisted replies carry their actual model attribution. */
export function ChatHeader(properties: ChatHeaderProps) {
  return <header className="chat-header"><ChatIdentity {...properties} /><ChatActions {...properties} /></header>;
}
