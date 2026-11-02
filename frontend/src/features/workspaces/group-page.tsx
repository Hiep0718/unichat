/**
 * Group page — the home of a Knowledge Space, laid out like a Workplace group.
 *
 * Header carries the group identity and its actions; the tabs below hold the
 * things that belong to the group: its posts, its files (which are also the
 * sources its AI assistant reads), its members and its description.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState, Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { GroupMark } from './components/group-mark';
import { useWorkspace } from './workspace-context';
import { useWorkspace as useWorkspaceQuery } from './workspace-hooks';
import { CoverBanner } from './components/cover-banner';
import { GroupTabSkeleton } from './components/group-tab-skeleton';
import { PendingApprovalBadge } from '../documents/components/pending-approval-badge';
import { visibilityOption } from './workspace-visibility';

import './group-page.css';

/**
 * Tabs rendered inside the group page, in reading order.
 *
 * `count` names which group statistic belongs beside the label. "Giới thiệu"
 * has none: a description is one thing or nothing, and "Giới thiệu 1" would
 * say less than the word alone.
 */
const TABS: readonly {
  path: string;
  label: string;
  icon: string;
  count?: 'postCount' | 'documentCount' | 'memberCount';
}[] = [
  { path: 'discussions', label: 'Bài viết', icon: 'forum', count: 'postCount' },
  { path: 'documents', label: 'Tệp', icon: 'folder', count: 'documentCount' },
  { path: 'members', label: 'Thành viên', icon: 'group', count: 'memberCount' },
  { path: 'about', label: 'Giới thiệu', icon: 'info' },
];

export function GroupPage() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const { workspace, canEdit, isOwner } = useWorkspace();
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
        topics={workspace.topics}
        canEdit={canEdit}
        onChanged={() => {
          void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        }}
      />

      <header className="group-page__header group-page__header--under-cover">
        <div className="group-page__identity">
          <GroupMark workspaceId={workspaceId} name={workspace.name} size={72} />
          <div className="group-page__titles">
            <h1 className="group-page__name">{workspace.name}</h1>
            <p className="group-page__sub">
              {isOwner ? (
                <Link
                  to={`/workspaces/${workspaceId}/settings?tab=access`}
                  className="group-page__visibility-link"
                  title="Đổi chế độ hiển thị của nhóm"
                >
                  <Icon name={visibilityOption(workspace.visibility).icon} size={15} />
                  {visibilityOption(workspace.visibility).groupLabel}
                </Link>
              ) : (
                <>
                  <Icon name={visibilityOption(workspace.visibility).icon} size={15} />
                  {visibilityOption(workspace.visibility).groupLabel}
                </>
              )}
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

      {/* Every tab here stays inside this page. The assistant used to sit at
          the head of this row and navigate away to a full-screen page,
          dropping the tab bar it appeared to belong to; it is the button in
          the header instead, where leaving is what a button is for. */}
      <nav className="group-page__tabs" aria-label="Mục của nhóm">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `group-tab ${isActive ? 'group-tab--active' : ''}`
            }
          >
            <Icon name={tab.icon} size={17} rounded />
            {tab.label}
            {/* Only once the group has loaded, and never a zero: "Tệp 0" is a
                heavier way of saying what the empty tab already says. */}
            {tab.count && details && details[tab.count] > 0 && (
              <span className="group-tab__count">{details[tab.count]}</span>
            )}
            {tab.path === 'documents' && <PendingApprovalBadge />}
          </NavLink>
        ))}
      </nav>

      {/* The tabs are lazy chunks and the only Suspense boundary used to be the
          one around the whole router, so every tab click replaced the entire
          page — cover, header and tab bar included — with a full-screen
          loader and then rebuilt it. Suspending here keeps the chrome still
          and swaps only the panel under it. */}
      <div className="group-page__body">
        <Suspense fallback={<GroupTabSkeleton />}>
          <Outlet />
        </Suspense>
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
