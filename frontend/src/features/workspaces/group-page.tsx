/**
 * Group page — the home of a Knowledge Space, laid out like a Workplace group.
 *
 * Header carries the group identity and its actions; the tabs below hold the
 * things that belong to the group: its posts, its files (which are also the
 * sources its AI assistant reads), its members and its description.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { GroupMark } from './components/group-mark';
import { useWorkspace } from './workspace-context';
import { useWorkspace as useWorkspaceQuery } from './workspace-hooks';
import { CoverBanner } from './components/cover-banner';

import type { WorkspaceVisibility } from './workspace-context';
import './group-page.css';

/** Tabs rendered inside the group page, in reading order. */
const TABS: readonly { path: string; label: string; icon: string }[] = [
  { path: 'discussions', label: 'Bài viết', icon: 'forum' },
  { path: 'documents', label: 'Tệp', icon: 'folder' },
  { path: 'members', label: 'Thành viên', icon: 'group' },
  { path: 'about', label: 'Giới thiệu', icon: 'info' },
];

const VISIBILITY_LABEL: Record<WorkspaceVisibility, string> = {
  PUBLIC: 'Nhóm công khai',
  SHARED: 'Nhóm được chia sẻ',
  PRIVATE: 'Nhóm riêng tư',
};

const VISIBILITY_ICON: Record<WorkspaceVisibility, string> = {
  PUBLIC: 'public',
  SHARED: 'group',
  PRIVATE: 'lock',
};

export function GroupPage() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const { workspace, canEdit } = useWorkspace();
  const { data: details } = useWorkspaceQuery(workspaceId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!workspace) return null;

  return (
    <div className="group-page">
      <CoverBanner
        workspaceId={workspaceId}
        name={workspace.name}
        hasCover={details?.hasCover ?? false}
        canEdit={canEdit}
        onChanged={() => {
          void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        }}
      />

      <header className="group-page__header group-page__header--under-cover">
        <div className="group-page__identity">
          <GroupMark workspaceId={workspaceId} name={workspace.name} size={52} />
          <div className="group-page__titles">
            <h1 className="group-page__name">{workspace.name}</h1>
            <p className="group-page__sub">
              <Icon name={VISIBILITY_ICON[workspace.visibility]} size={15} />
              {VISIBILITY_LABEL[workspace.visibility]}
              {details && (
                <>
                  <span className="group-page__dot">·</span>
                  {details.memberCount} thành viên
                  <span className="group-page__dot">·</span>
                  {details.documentCount} tệp
                </>
              )}
            </p>
          </div>
        </div>

        <div className="group-page__actions">
          <button
            type="button"
            className="group-page__assistant"
            onClick={() => navigate(`/workspaces/${workspaceId}/chat`)}
          >
            <Icon name="auto_awesome" size={18} />
            Trợ lý AI
          </button>

          <div className="group-page__menu-wrap">
            <button
              type="button"
              className="group-page__menu-btn"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Thêm tuỳ chọn"
            >
              <Icon name="more_horiz" size={20} />
            </button>
            {menuOpen && (
              <GroupMenu
                workspaceId={workspaceId}
                canEdit={canEdit}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>
      </header>

      <nav className="group-page__tabs" aria-label="Mục của nhóm">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `group-tab ${isActive ? 'group-tab--active' : ''}`
            }
          >
            <Icon name={tab.icon} size={17} />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="group-page__body">
        <Outlet />
      </div>
    </div>
  );
}

interface GroupMenuProps {
  readonly workspaceId: string;
  readonly canEdit: boolean;
  readonly onClose: () => void;
}

/** Secondary destinations that do not deserve a permanent tab. */
function GroupMenu({ workspaceId, canEdit, onClose }: GroupMenuProps) {
  const navigate = useNavigate();

  const go = (path: string) => {
    onClose();
    navigate(`/workspaces/${workspaceId}/${path}`);
  };

  return (
    <>
      <div className="group-page__menu-backdrop" onClick={onClose} />
      <div className="group-page__menu" role="menu">
        <button type="button" role="menuitem" onClick={() => go('overview')}>
          <Icon name="dashboard" size={17} />
          Tổng quan
        </button>
        <button type="button" role="menuitem" onClick={() => go('conversations')}>
          <Icon name="history" size={17} />
          Lịch sử hội thoại
        </button>
        {canEdit && (
          <>
            <button type="button" role="menuitem" onClick={() => go('evaluation')}>
              <Icon name="analytics" size={17} />
              Đánh giá
            </button>
            <button type="button" role="menuitem" onClick={() => go('settings')}>
              <Icon name="settings" size={17} />
              Cài đặt nhóm
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default GroupPage;
