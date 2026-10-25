import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { MemberTable } from '../members/components/member-table';
import { useWorkspace } from '../workspaces/workspace-context';
import { AccessForm } from './access-form';
import { DangerZone } from './danger-zone';
import { GeneralForm } from './general-form';
import { PrivacyForm } from './privacy-form';

import './settings.css';
import './settings-page.css';

type SettingsTab = 'general' | 'access' | 'privacy' | 'danger';
const TABS: readonly { value: SettingsTab; label: string; ownerOnly: boolean }[] = [
  { value: 'general', label: 'Thông tin chung', ownerOnly: false },
  { value: 'access', label: 'Quyền truy cập & Thành viên', ownerOnly: true },
  { value: 'privacy', label: 'AI & Quyền riêng tư', ownerOnly: false },
  { value: 'danger', label: 'Vùng nguy hiểm', ownerOnly: true },
];

/** Displays workspace settings with owner-controlled AI processing consent. */
export function WorkspaceSettingsPage() {
  const { workspace, isOwner, canEdit } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    searchParams.get('tab') === 'privacy' ? 'privacy' : 'general'
  );
  if (!workspace) return null;

  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <p className="settings-page__eyebrow">Quản trị Workspace</p>
        <h1 className="settings-page__title">Cài đặt Workspace — {workspace.name}</h1>
        <p className="settings-page__subtitle">Cấu hình thông tin, quyền truy cập thành viên và tùy chọn bảo mật.</p>
      </header>
      <div className="settings-page__tabs" role="tablist" aria-label="Cài đặt Workspace">
        {TABS.filter((tab) => !tab.ownerOnly || isOwner).map((tab) => (
          <button className="settings-page__tab" key={tab.value} role="tab" type="button"
            id={`settings-tab-${tab.value}`} aria-controls="settings-panel" aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}>{tab.label}</button>
        ))}
      </div>
      <div className="settings-page__panel" id="settings-panel" role="tabpanel"
        aria-labelledby={`settings-tab-${activeTab}`}>
        {activeTab === 'general' && <GeneralForm key={workspace.id} workspace={workspace} canEdit={canEdit} />}
        {activeTab === 'access' && isOwner && <div className="settings-tab">
          <AccessForm key={workspace.id} workspace={workspace} />
          <section className="settings-section">
            <h3 className="settings-section__title">Danh sách Thành viên</h3>
            <MemberTable workspaceId={workspace.id} isOwner={isOwner} />
          </section>
        </div>}
        {activeTab === 'privacy' && <PrivacyForm key={workspace.id} workspace={workspace} isOwner={isOwner} />}
        {activeTab === 'danger' && isOwner && <DangerZone key={workspace.id} workspace={workspace} />}
      </div>
    </main>
  );
}

export default WorkspaceSettingsPage;
