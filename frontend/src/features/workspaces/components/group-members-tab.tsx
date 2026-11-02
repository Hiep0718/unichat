/**
 * Members tab of a group. Thin wrapper that supplies the member panel with the
 * ids and permissions it needs from the workspace context.
 */
import { useParams } from 'react-router-dom';

import { MemberPanel } from '../../members';
import { useWorkspace } from '../workspace-context';

export function GroupMembersTab() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const { isOwner, workspace } = useWorkspace();

  return (
    <MemberPanel
      workspaceId={workspaceId}
      isOwner={isOwner}
      visibility={workspace?.visibility}
    />
  );
}

export default GroupMembersTab;
