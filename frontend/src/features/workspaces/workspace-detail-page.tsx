/**
 * Workspace detail page with header, tab navigation, and content area.
 * Fetches real workspace data from API and renders functional tabs.
 */

import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { DocumentTable } from '../documents/document-table';
import { useDocuments, useDeleteDocument } from '../documents/document-hooks';
import { MemberTable } from '../members';
import { OverviewTab } from './components/overview-tab';
import { WorkspaceSettings } from '../settings/workspace-settings';
import { useWorkspace as useWorkspaceQuery } from './workspace-hooks';
import { useWorkspace as useWorkspaceContext } from './workspace-context';

import type { WorkspaceVisibility } from './workspace-schema';

import './workspace-detail-page.css';

/** Tab definitions for workspace detail view. */
const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: 'dashboard' },
  { id: 'documents', label: 'Tài liệu', icon: 'description' },
  { id: 'chat', label: 'Trò chuyện', icon: 'chat' },
  { id: 'members', label: 'Thành viên', icon: 'group' },
  { id: 'settings', label: 'Cài đặt', icon: 'settings' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const VISIBILITY_LABELS: Record<WorkspaceVisibility, string> = {
  PRIVATE: 'Riêng tư',
  SHARED: 'Được chia sẻ',
  PUBLIC: 'Công khai',
};

/**
 * Main container for workspace detail view.
 */
function WorkspaceDetailPage() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { data: workspace, isLoading: wsLoading } = useWorkspaceQuery(workspaceId);

  return (
    <main className="ws-detail">
      <WorkspaceHeader
        workspace={workspace}
        isLoading={wsLoading}
        onTabChange={setActiveTab}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="ws-detail__content">
        <TabContent
          activeTab={activeTab}
          workspaceId={workspaceId}
          workspace={workspace}
          wsLoading={wsLoading}
        />
      </div>
    </main>
  );
}

export default WorkspaceDetailPage;

/* ─── Header ─────────────────────────────────────────────── */

interface WorkspaceHeaderProps {
  readonly workspace: import('./workspace-schema').WorkspaceDto | undefined;
  readonly isLoading: boolean;
  readonly onTabChange: (tab: TabId) => void;
}

function WorkspaceHeader({ workspace, isLoading, onTabChange }: WorkspaceHeaderProps) {
  const visibilityClass = workspace
    ? `ws-detail__badge--${workspace.visibility.toLowerCase()}`
    : '';

  return (
    <header className="ws-detail__header">
      <div className="ws-detail__header-left">
        {isLoading ? (
          <h2 className="ws-detail__title">Đang tải...</h2>
        ) : workspace ? (
          <>
            <h2 className="ws-detail__title">{workspace.name}</h2>
            <span className={`ws-detail__badge ${visibilityClass}`}>
              {VISIBILITY_LABELS[workspace.visibility]}
            </span>
          </>
        ) : (
          <h2 className="ws-detail__title">Workspace không tồn tại</h2>
        )}
      </div>
      <div className="ws-detail__header-actions">
        <button
          className="ws-detail__action-btn ws-detail__action-btn--outline"
          type="button"
          onClick={() => onTabChange('members')}
        >
          <Icon name="person_add" size={18} />
          Mời thành viên
        </button>
        <button
          className="ws-detail__action-btn ws-detail__action-btn--outline"
          type="button"
          onClick={() => onTabChange('settings')}
        >
          <Icon name="settings" size={18} />
          Cài đặt
        </button>
        <button className="ws-detail__action-btn ws-detail__action-btn--primary" type="button">
          <Icon name="upload" size={18} />
          Upload tài liệu
        </button>
      </div>
    </header>
  );
}

/* ─── Tab Bar ────────────────────────────────────────────── */

function TabBar({
  activeTab,
  onTabChange,
}: {
  readonly activeTab: TabId;
  readonly onTabChange: (tab: TabId) => void;
}) {
  return (
    <nav className="ws-detail__tabs" aria-label="Workspace tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`ws-detail__tab ${activeTab === tab.id ? 'ws-detail__tab--active' : ''}`}
          type="button"
          onClick={() => onTabChange(tab.id)}
          aria-selected={activeTab === tab.id}
          role="tab"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

/* ─── Tab Content ────────────────────────────────────────── */

function TabContent({
  activeTab,
  workspaceId,
  workspace,
  wsLoading,
}: {
  readonly activeTab: TabId;
  readonly workspaceId: string;
  readonly workspace: import('./workspace-schema').WorkspaceDto | undefined;
  readonly wsLoading: boolean;
}) {
  switch (activeTab) {
    case 'overview':
      return <OverviewTab workspace={workspace} isLoading={wsLoading} />;
    case 'documents':
      return <DocumentsTab workspaceId={workspaceId} />;
    case 'chat':
      return <TabPlaceholder icon="chat" title="Trò chuyện" />;
    case 'members':
      return <MembersTab workspaceId={workspaceId} />;
    case 'settings':
      return (
        <WorkspaceSettings
          workspace={workspace}
          isLoading={wsLoading}
          workspaceId={workspaceId}
        />
      );
    default:
      return null;
  }
}

/* ─── Documents Tab ──────────────────────────────────────── */

function DocumentsTab({ workspaceId }: { readonly workspaceId: string }) {
  const { data: documents = [], isLoading } = useDocuments(workspaceId);
  const deleteMutation = useDeleteDocument(workspaceId);

  const handleDelete = useCallback(
    (documentId: string) => deleteMutation.mutate(documentId),
    [deleteMutation],
  );

  return (
    <DocumentTable
      documents={documents as any}
      isLoading={isLoading}
      onDelete={handleDelete}
    />
  );
}

/* ─── Members Tab ────────────────────────────────────────── */

function MembersTab({ workspaceId }: { readonly workspaceId: string }) {
  const { isOwner } = useWorkspaceContext();
  return <MemberTable workspaceId={workspaceId} isOwner={isOwner} />;
}

/* ─── Placeholder ────────────────────────────────────────── */

function TabPlaceholder({
  icon,
  title,
}: {
  readonly icon: string;
  readonly title: string;
}) {
  return (
    <div className="ws-detail__placeholder">
      <Icon name={icon} size={48} />
      <h3>{title}</h3>
      <p>Tính năng này đang được phát triển.</p>
    </div>
  );
}
