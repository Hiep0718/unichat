/**
 * Workspace detail page with header, tab navigation, and content area.
 * Currently shows Documents tab content; other tabs display placeholders.
 */

import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { DocumentTable } from '../documents/document-table';
import { useDocuments, useDeleteDocument } from '../documents/document-hooks';

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

/**
 * Renders workspace detail page with header, tabs, and tab content.
 */
function WorkspaceDetailPage() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('documents');

  return (
    <main className="ws-detail">
      <WorkspaceHeader workspaceId={workspaceId} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="ws-detail__content">
        <TabContent activeTab={activeTab} workspaceId={workspaceId} />
      </div>
    </main>
  );
}

export default WorkspaceDetailPage;

/* ─── Header ─────────────────────────────────────────────── */

function WorkspaceHeader({ workspaceId }: { readonly workspaceId: string }) {
  void workspaceId; // Will be used to fetch real workspace data
  return (
    <header className="ws-detail__header">
      <div className="ws-detail__header-left">
        <h2 className="ws-detail__title">Tài liệu môn Trí tuệ nhân tạo</h2>
        <span className="ws-detail__badge ws-detail__badge--public">Công khai</span>
      </div>
      <div className="ws-detail__header-actions">
        <button className="ws-detail__action-btn ws-detail__action-btn--outline" type="button">
          <Icon name="person_add" size={18} />
          Mời thành viên
        </button>
        <button className="ws-detail__action-btn ws-detail__action-btn--outline" type="button">
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
}: {
  readonly activeTab: TabId;
  readonly workspaceId: string;
}) {
  switch (activeTab) {
    case 'documents':
      return <DocumentsTab workspaceId={workspaceId} />;
    case 'overview':
      return <TabPlaceholder icon="dashboard" title="Tổng quan" />;
    case 'chat':
      return <TabPlaceholder icon="chat" title="Trò chuyện" />;
    case 'members':
      return <TabPlaceholder icon="group" title="Thành viên" />;
    case 'settings':
      return <TabPlaceholder icon="settings" title="Cài đặt" />;
    default:
      return null;
  }
}

function DocumentsTab({ workspaceId }: { readonly workspaceId: string }) {
  const { data: documents = [], isLoading } = useDocuments(workspaceId);
  const deleteMutation = useDeleteDocument(workspaceId);

  const handleDelete = useCallback(
    (documentId: string) => deleteMutation.mutate(documentId),
    [deleteMutation],
  );

  return (
    <DocumentTable
      documents={documents}
      isLoading={isLoading}
      onDelete={handleDelete}
    />
  );
}

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
