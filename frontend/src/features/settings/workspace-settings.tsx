import { AccessForm } from './access-form';
import { DangerZone } from './danger-zone';
import { GeneralForm } from './general-form';
import { PrivacyForm } from './privacy-form';

import type { WorkspaceDto } from '../workspaces/workspace-schema';

import './settings.css';

interface WorkspaceSettingsProps {
  readonly workspace: WorkspaceDto | undefined;
  readonly isLoading: boolean;
  readonly workspaceId: string;
}

/** Shares the same workspace settings forms when embedded inside a group tab. */
export function WorkspaceSettings({ workspace, isLoading }: WorkspaceSettingsProps) {
  if (isLoading || !workspace) return <div className="settings-tab"><p>Đang tải cài đặt...</p></div>;
  const isOwner = workspace.userRole === 'OWNER';
  const canEdit = isOwner || workspace.userRole === 'EDITOR';

  return (
    <div className="settings-tab">
      <GeneralForm key={`general-${workspace.id}`} workspace={workspace} canEdit={canEdit} />
      <PrivacyForm key={`privacy-${workspace.id}`} workspace={workspace} isOwner={isOwner} />
      {isOwner && <AccessForm key={`access-${workspace.id}`} workspace={workspace} />}
      {isOwner && <DangerZone key={`danger-${workspace.id}`} workspace={workspace} />}
    </div>
  );
}
