/**
 * Members tab of a group. Thin wrapper that supplies the member table with the
 * ids and permissions it needs from the workspace context.
 */
import { useParams } from 'react-router-dom';

import { MemberTable } from '../../members';
import { useWorkspace } from '../workspace-context';

export function GroupMembersTab() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const { isOwner } = useWorkspace();

  return <MemberTable workspaceId={workspaceId} isOwner={isOwner} />;
}

export default GroupMembersTab;
