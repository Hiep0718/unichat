/**
 * Overview tab showing workspace statistics and information.
 * Displays stat cards, metadata, and description.
 */

import { Icon } from '../../../components/icon';

import type { WorkspaceDto } from '../workspace-schema';

import './overview-tab.css';

const VISIBILITY_LABELS: Record<string, string> = {
  PRIVATE: 'Riêng tư',
  SHARED: 'Chia sẻ',
  PUBLIC: 'Công khai',
};

interface OverviewTabProps {
  readonly workspace: WorkspaceDto | undefined;
  readonly isLoading: boolean;
}

/** Formats ISO date to Vietnamese locale display. */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Renders workspace overview with statistics and metadata.
 */
export function OverviewTab({ workspace, isLoading }: OverviewTabProps) {
  if (isLoading || !workspace) {
    return (
      <div className="overview-tab">
        <div className="overview-tab__stats">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="overview-tab__stat-card">
              <div className="overview-tab__stat-icon overview-tab__stat-icon--documents">
                <Icon name="hourglass_empty" size={24} />
              </div>
              <div className="overview-tab__stat-info">
                <span className="overview-tab__stat-value">—</span>
                <span className="overview-tab__stat-label">Đang tải...</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const visibilityClass = workspace.visibility.toLowerCase();

  return (
    <div className="overview-tab">
      <div className="overview-tab__stats">
        <div className="overview-tab__stat-card">
          <div className="overview-tab__stat-icon overview-tab__stat-icon--documents">
            <Icon name="description" size={24} />
          </div>
          <div className="overview-tab__stat-info">
            <span className="overview-tab__stat-value">{workspace.documentCount}</span>
            <span className="overview-tab__stat-label">Tài liệu</span>
          </div>
        </div>

        <div className="overview-tab__stat-card">
          <div className="overview-tab__stat-icon overview-tab__stat-icon--members">
            <Icon name="group" size={24} />
          </div>
          <div className="overview-tab__stat-info">
            <span className="overview-tab__stat-value">{workspace.memberCount}</span>
            <span className="overview-tab__stat-label">Thành viên</span>
          </div>
        </div>

        <div className="overview-tab__stat-card">
          <div className="overview-tab__stat-icon overview-tab__stat-icon--conversations">
            <Icon name="chat" size={24} />
          </div>
          <div className="overview-tab__stat-info">
            <span className="overview-tab__stat-value">0</span>
            <span className="overview-tab__stat-label">Cuộc trò chuyện</span>
          </div>
        </div>
      </div>

      <div className="overview-tab__info">
        <h3 className="overview-tab__info-title">Thông tin workspace</h3>
        <div className="overview-tab__info-grid">
          <div className="overview-tab__info-item">
            <span className="overview-tab__info-label">Chế độ hiển thị</span>
            <span className="overview-tab__info-value">
              <span className={`overview-tab__visibility overview-tab__visibility--${visibilityClass}`}>
                {VISIBILITY_LABELS[workspace.visibility] ?? workspace.visibility}
              </span>
            </span>
          </div>
          <div className="overview-tab__info-item">
            <span className="overview-tab__info-label">Ngày tạo</span>
            <span className="overview-tab__info-value">{formatDate(workspace.createdAt)}</span>
          </div>
          <div className="overview-tab__info-item">
            <span className="overview-tab__info-label">Cập nhật lần cuối</span>
            <span className="overview-tab__info-value">{formatDate(workspace.updatedAt)}</span>
          </div>
        </div>
      </div>

      <div className="overview-tab__description">
        <h3 className="overview-tab__description-title">Mô tả</h3>
        {workspace.description ? (
          <p className="overview-tab__description-text">{workspace.description}</p>
        ) : (
          <p className="overview-tab__description-text overview-tab__description-empty">
            Chưa có mô tả cho workspace này.
          </p>
        )}
      </div>
    </div>
  );
}
