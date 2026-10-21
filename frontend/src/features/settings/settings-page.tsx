import { useSearchParams } from 'react-router-dom';

import { MemberTable } from '../members/components/member-table';
import { useWorkspace } from '../workspaces/workspace-context';
import { InvitePanel } from '../workspaces/components/invite-panel';
import { AccessForm } from './access-form';
import { DangerZone } from './danger-zone';
import { GeneralForm } from './general-form';
import { PrivacyForm } from './privacy-form';

import './settings.css';

type SettingsTab = 'general' | 'access' | 'privacy' | 'danger';
const TABS: readonly { value: SettingsTab; label: string; ownerOnly: boolean }[] = [
  { value: 'general', label: 'Thông tin chung', ownerOnly: false },
  { value: 'access', label: 'Quyền truy cập & Thành viên', ownerOnly: true },
  { value: 'privacy', label: 'AI & Quyền riêng tư', ownerOnly: false },
  { value: 'danger', label: 'Vùng nguy hiểm', ownerOnly: true },
];

/** Reads the tab named in the URL, so a link can open the one it means. */
function tabFromQuery(raw: string | null): SettingsTab {
  return TABS.find((tab) => tab.value === raw)?.value ?? 'general';
}

/** Displays workspace settings with owner-controlled AI processing consent. */
export function WorkspaceSettingsPage() {
  const { workspace, isOwner, canEdit } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();

  // Held in the URL rather than in state alone: a screen that tells an owner
  // to change a setting has to be able to land them on it, and sending them
  // to the first tab to hunt for it is barely better than saying nothing.
  const activeTab = tabFromQuery(searchParams.get('tab'));
  const setActiveTab = (tab: SettingsTab) => setSearchParams({ tab }, { replace: true });

  if (!workspace) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Cài đặt Workspace — {workspace.name}</h1>
        <p>Cấu hình thông tin, quyền truy cập thành viên và tùy chọn bảo mật.</p>
      </header>
      <div role="tablist" aria-label="Cài đặt Workspace" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
        {TABS.filter((tab) => !tab.ownerOnly || isOwner).map((tab) => (
          <button key={tab.value} role="tab" type="button" aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}>{tab.label}</button>
        ))}
      </div>
      {activeTab === 'general' && <GeneralForm key={workspace.id} workspace={workspace} canEdit={canEdit} />}
      {activeTab === 'access' && isOwner && <div className="settings-tab">
        <AccessForm key={workspace.id} workspace={workspace} />
        <section className="settings-section">
          <h3>Link mời</h3>
          <InvitePanel workspaceId={workspace.id} visibility={workspace.visibility} />
        </section>
        <section className="settings-section">
          <h3>Danh sách Thành viên</h3>
          <MemberTable workspaceId={workspace.id} isOwner={isOwner} visibility={workspace.visibility} />
        </section>
      </div>}
      {activeTab === 'privacy' && <PrivacyForm key={workspace.id} workspace={workspace} isOwner={isOwner} />}
      {activeTab === 'danger' && isOwner && <DangerZone key={workspace.id} workspace={workspace} />}
    </div>
  );
}

export default WorkspaceSettingsPage;
