import { Link } from 'react-router-dom';

import { useWorkspace } from './workspace-context';
import './workspace-overview-page.css';

export function WorkspaceOverviewPage() {
  const { workspace, role, isOwner, canEdit } = useWorkspace();

  if (!workspace) return null;

  const visibilityText =
    workspace.visibility === 'PUBLIC'
      ? 'Công khai'
      : workspace.visibility === 'SHARED'
      ? 'Chia sẻ'
      : 'Riêng tư';

  const visibilityClass =
    workspace.visibility === 'PUBLIC'
      ? 'ws-overview-badge--public'
      : workspace.visibility === 'SHARED'
      ? 'ws-overview-badge--shared'
      : 'ws-overview-badge--private';

  return (
    <div className="ws-overview-container">
      {/* 1. Hero Header Banner */}
      <header className="ws-overview-hero">
        <div className="ws-overview-hero__left">
          <div className="ws-overview-hero__icon-box">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>dataset</span>
          </div>
          <div className="ws-overview-hero__meta">
            <div className="ws-overview-hero__title-row">
              <h1 className="ws-overview-hero__title">{workspace.name}</h1>
              <span className={`ws-overview-badge ${visibilityClass}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {workspace.visibility === 'PUBLIC' ? 'public' : workspace.visibility === 'SHARED' ? 'group' : 'lock'}
                </span>
                <span>{visibilityText}</span>
              </span>
              <span className="ws-overview-badge ws-overview-badge--role">
                <span>Vai trò: {role}</span>
              </span>
            </div>
            <p className="ws-overview-hero__desc">
              {workspace.description ||
                'Không gian lưu trữ và truy xuất tri thức tự động cho tài liệu giáo trình và thông tin học tập.'}
            </p>
          </div>
        </div>

        {canEdit && (
          <Link to={`/workspaces/${workspace.id}/settings`} className="ws-overview-hero__settings-btn">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
            <span>Cài đặt Workspace</span>
          </Link>
        )}
      </header>

      {/* 2. Quick Stats Summary Grid */}
      <div className="ws-overview-stats-grid">
        <div className="ws-overview-stat-card">
          <div className="ws-overview-stat-card__icon-box">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <div className="ws-overview-stat-card__info">
            <span className="ws-overview-stat-card__value">Gemini 3.5 Flash</span>
            <span className="ws-overview-stat-card__label">Engine RAG AI</span>
          </div>
        </div>

        <div className="ws-overview-stat-card">
          <div className="ws-overview-stat-card__icon-box">
            <span className="material-symbols-outlined">speed</span>
          </div>
          <div className="ws-overview-stat-card__info">
            <span className="ws-overview-stat-card__value">&lt; 300ms</span>
            <span className="ws-overview-stat-card__label">Tốc độ Vector Search</span>
          </div>
        </div>

        <div className="ws-overview-stat-card">
          <div className="ws-overview-stat-card__icon-box">
            <span className="material-symbols-outlined">verified_user</span>
          </div>
          <div className="ws-overview-stat-card__info">
            <span className="ws-overview-stat-card__value">Zero-Trust AI</span>
            <span className="ws-overview-stat-card__label">Phân quyền 2 lớp</span>
          </div>
        </div>

        <div className="ws-overview-stat-card">
          <div className="ws-overview-stat-card__icon-box">
            <span className="material-symbols-outlined">database</span>
          </div>
          <div className="ws-overview-stat-card__info">
            <span className="ws-overview-stat-card__value">PROCESSED</span>
            <span className="ws-overview-stat-card__label">Chuẩn bóc tách Vector</span>
          </div>
        </div>
      </div>

      {/* 3. Action Hub Cards Grid */}
      <section className="ws-overview-hubs-grid">
        {/* Hub 1: AI Chat (Primary CTA) */}
        <Link to={`/workspaces/${workspace.id}/chat`} className="ws-hub-card ws-hub-card--primary">
          <div>
            <div className="ws-hub-card__header" style={{ marginBottom: '14px' }}>
              <div className="ws-hub-card__icon-box">
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>forum</span>
              </div>
              <h3 className="ws-hub-card__title">Hỏi đáp Tri thức AI</h3>
            </div>
            <p className="ws-hub-card__desc">
              Đặt câu hỏi trực tiếp và nhận phản hồi tức thì với trích dẫn minh bạch từ toàn bộ kho tài liệu trong Workspace.
            </p>
          </div>
          <div className="ws-hub-card__footer">
            <span className="ws-hub-card__action-text">
              <span>Bắt đầu Hỏi AI</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </span>
          </div>
        </Link>

        {/* Hub 2: Document Management */}
        <Link to={`/workspaces/${workspace.id}/documents`} className="ws-hub-card ws-hub-card--secondary">
          <div>
            <div className="ws-hub-card__header" style={{ marginBottom: '14px' }}>
              <div className="ws-hub-card__icon-box">
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>upload_file</span>
              </div>
              <h3 className="ws-hub-card__title">Quản lý Tài liệu</h3>
            </div>
            <p className="ws-hub-card__desc">
              {canEdit
                ? 'Tải lên giáo trình PDF, DOCX, TXT để bóc tách Vector và làm giàu kho tri thức RAG.'
                : 'Xem danh sách tài liệu giáo trình đã được bóc tách trong không gian này.'}
            </p>
          </div>
          <div className="ws-hub-card__footer">
            <span className="ws-hub-card__action-text">
              <span>Quản lý kho tài liệu</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </span>
          </div>
        </Link>

        {/* Hub 3: Conversation History */}
        <Link to={`/workspaces/${workspace.id}/conversations`} className="ws-hub-card ws-hub-card--secondary">
          <div>
            <div className="ws-hub-card__header" style={{ marginBottom: '14px' }}>
              <div className="ws-hub-card__icon-box">
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>history</span>
              </div>
              <h3 className="ws-hub-card__title">Lịch sử Hỏi đáp</h3>
            </div>
            <p className="ws-hub-card__desc">
              Truy xuất lại các phiên thảo luận cũ, rà soát lại nguồn trích dẫn và tiếp tục các câu hỏi dở dang.
            </p>
          </div>
          <div className="ws-hub-card__footer">
            <span className="ws-hub-card__action-text">
              <span>Xem lịch sử thảo luận</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </span>
          </div>
        </Link>
      </section>

      {/* 4. Security & Policy Section */}
      <section className="ws-overview-security-card">
        <div className="ws-overview-security-card__header">
          <div className="ws-overview-security-card__icon-box">
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>shield</span>
          </div>
          <h3 className="ws-overview-security-card__title">Thông tin Phân quyền & Bảo mật Tri thức</h3>
        </div>

        <div className="ws-overview-security-list">
          <div className="ws-security-item">
            <span className="material-symbols-outlined ws-security-item__icon">check_circle</span>
            <p className="ws-security-item__text">
              Chỉ các tài liệu ở trạng thái <strong>PROCESSED</strong> mới được đưa vào không gian vector RAG.
            </p>
          </div>

          <div className="ws-security-item">
            <span className="material-symbols-outlined ws-security-item__icon">check_circle</span>
            <p className="ws-security-item__text">
              Quyền hạn truy cập tài liệu được kiểm soát nghiêm ngặt bởi <strong>Core API</strong> trước khi gửi truy vấn tới AI Service.
            </p>
          </div>

          <div className="ws-security-item">
            <span className="material-symbols-outlined ws-security-item__icon">check_circle</span>
            <p className="ws-security-item__text">
              {isOwner
                ? 'Bạn là Owner của Workspace này. Bạn có toàn quyền quản lý thành viên và cấu hình phân quyền.'
                : 'Bạn đang tham gia với tư cách thành viên trong Workspace.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default WorkspaceOverviewPage;
