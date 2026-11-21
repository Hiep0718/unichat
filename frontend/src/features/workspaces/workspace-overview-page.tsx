import { Link } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { ROLE_LABELS } from '../members/member-schema';
import { useWorkspace } from './workspace-context';
import { useWorkspace as useWorkspaceRecord } from './workspace-hooks';
import './workspace-overview-page.css';

import type { WorkspaceDetails } from './workspace-context';
import type { WorkspaceDto } from './workspace-schema';

/** How each visibility level is named and drawn on the hero. */
const VISIBILITY = {
  PUBLIC: { label: 'Công khai', icon: 'public' },
  SHARED: { label: 'Chia sẻ', icon: 'group' },
  PRIVATE: { label: 'Riêng tư', icon: 'lock' },
} as const;

const FALLBACK_DESCRIPTION =
  'Nơi lưu trữ giáo trình, tài liệu học tập và hỏi đáp có trích dẫn nguồn cho cả nhóm.';

interface HeroProps {
  readonly workspace: WorkspaceDetails;
  readonly canEdit: boolean;
}

function OverviewHero({ workspace, canEdit }: HeroProps) {
  const visibility = VISIBILITY[workspace.visibility];
  return (
    <header className="ws-overview-hero">
      <div className="ws-overview-hero__left">
        <div className="ws-overview-hero__icon-box">
          <Icon name="dataset" size={30} />
        </div>
        <div className="ws-overview-hero__meta">
          <div className="ws-overview-hero__title-row">
            <h1 className="ws-overview-hero__title">{workspace.name}</h1>
            <span className="ws-overview-badge">
              <Icon name={visibility.icon} size={14} />
              {visibility.label}
            </span>
            <span className="ws-overview-badge">{ROLE_LABELS[workspace.role]}</span>
          </div>
          <p className="ws-overview-hero__desc">{workspace.description || FALLBACK_DESCRIPTION}</p>
        </div>
      </div>
      {canEdit && (
        <Link to={`/workspaces/${workspace.id}/settings`} className="ws-overview-hero__settings-btn">
          <Icon name="settings" size={18} />
          Cài đặt nhóm
        </Link>
      )}
    </header>
  );
}

/** Counts for the group, read from the record the shell already loaded. */
function OverviewStats({ record }: { readonly record: WorkspaceDto | undefined }) {
  const value = (n: number | undefined) => (n === undefined ? '—' : n.toLocaleString('vi-VN'));
  const stats = [
    { icon: 'description', label: 'Tài liệu', value: value(record?.documentCount) },
    { icon: 'group', label: 'Thành viên', value: value(record?.memberCount) },
    { icon: 'forum', label: 'Bài viết', value: value(record?.postCount) },
    { icon: 'trending_up', label: 'Bài trong 7 ngày', value: value(record?.recentPostCount) },
  ];
  return (
    <div className="ws-overview-stats-grid">
      {stats.map((stat) => (
        <div key={stat.label} className="ws-overview-stat-card">
          <div className="ws-overview-stat-card__icon-box">
            <Icon name={stat.icon} size={22} />
          </div>
          <div className="ws-overview-stat-card__info">
            <span className="ws-overview-stat-card__value">{stat.value}</span>
            <span className="ws-overview-stat-card__label">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface Hub {
  readonly to: string;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly action: string;
  readonly primary?: boolean;
}

function HubCard({ hub }: { readonly hub: Hub }) {
  return (
    <Link to={hub.to} className={`ws-hub-card ${hub.primary ? 'ws-hub-card--primary' : 'ws-hub-card--secondary'}`}>
      <div className="ws-hub-card__body">
        <div className="ws-hub-card__header">
          <div className="ws-hub-card__icon-box">
            <Icon name={hub.icon} size={24} />
          </div>
          <h3 className="ws-hub-card__title">{hub.title}</h3>
        </div>
        <p className="ws-hub-card__desc">{hub.description}</p>
      </div>
      <div className="ws-hub-card__footer">
        <span className="ws-hub-card__action-text">
          {hub.action}
          <Icon name="arrow_forward" size={18} />
        </span>
      </div>
    </Link>
  );
}

function hubsFor(workspaceId: string, canEdit: boolean): readonly Hub[] {
  return [
    {
      to: `/workspaces/${workspaceId}/chat`, icon: 'forum', primary: true,
      title: 'Hỏi đáp với trợ lý AI', action: 'Bắt đầu hỏi',
      description: 'Đặt câu hỏi và nhận câu trả lời kèm trích dẫn từ chính tài liệu của nhóm.',
    },
    {
      to: `/workspaces/${workspaceId}/documents`, icon: 'upload_file',
      title: 'Quản lý tài liệu', action: 'Mở kho tài liệu',
      description: canEdit
        ? 'Tải lên giáo trình PDF, DOCX, TXT để trợ lý có thêm nguồn trích dẫn.'
        : 'Xem các tài liệu của nhóm mà trợ lý đang dùng làm nguồn.',
    },
    {
      to: `/workspaces/${workspaceId}/conversations`, icon: 'history',
      title: 'Lịch sử hỏi đáp', action: 'Xem lịch sử',
      description: 'Mở lại các phiên hỏi đáp cũ, xem lại nguồn trích dẫn và hỏi tiếp từ chỗ đã dừng.',
    },
  ];
}

function SecurityNotes({ isOwner }: { readonly isOwner: boolean }) {
  const notes = [
    <>Chỉ tài liệu <strong>đã xử lý xong</strong> mới được trợ lý dùng làm nguồn trả lời.</>,
    <>Quyền đọc tài liệu được <strong>Core API</strong> kiểm tra trước khi câu hỏi tới dịch vụ AI.</>,
    isOwner
      ? <>Bạn là <strong>chủ sở hữu</strong> nhóm: bạn quản lý thành viên và cấu hình quyền.</>
      : <>Bạn tham gia nhóm với tư cách <strong>thành viên</strong>.</>,
  ];
  return (
    <section className="ws-overview-security-card">
      <div className="ws-overview-security-card__header">
        <div className="ws-overview-security-card__icon-box">
          <Icon name="shield" size={22} />
        </div>
        <h3 className="ws-overview-security-card__title">Phân quyền và bảo mật tri thức</h3>
      </div>
      <div className="ws-overview-security-list">
        {notes.map((note, index) => (
          <div key={index} className="ws-security-item">
            <Icon name="check_circle" size={20} className="ws-security-item__icon" />
            <p className="ws-security-item__text">{note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** A group's landing summary: identity, counts, the three ways in, and the access rules. */
export function WorkspaceOverviewPage() {
  const { workspace, isOwner, canEdit } = useWorkspace();
  const { data: record } = useWorkspaceRecord(workspace?.id ?? '');

  if (!workspace) return null;

  return (
    <div className="ws-overview-container">
      <OverviewHero workspace={workspace} canEdit={canEdit} />
      <OverviewStats record={record} />
      <section className="ws-overview-hubs-grid">
        {hubsFor(workspace.id, canEdit).map((hub) => <HubCard key={hub.to} hub={hub} />)}
      </section>
      <SecurityNotes isOwner={isOwner} />
    </div>
  );
}

export default WorkspaceOverviewPage;
