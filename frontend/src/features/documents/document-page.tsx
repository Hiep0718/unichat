import { useState } from 'react';

import { useWorkspace } from '../workspaces/workspace-context';
import { DocumentTable } from './components/document-table';
import { PendingApprovalTab } from './components/pending-approval-tab';

export function DocumentPage() {
  const { workspace, canEdit, canContribute } = useWorkspace();
  // The table keeps its own copy of the documents, so an approval decision has
  // to tell it to reload.
  const [reloadToken, setReloadToken] = useState(0);

  if (!workspace) return null;

  // Rendered as the "Tệp" tab of the group page, which already shows the group
  // name and owns the page padding.
  return (
    <div>
      {/* Approval queue sits above the table and disappears when empty. */}
      <PendingApprovalTab
        workspaceId={workspace.id}
        canModerate={canEdit}
        hideWhenEmpty
        onDecision={() => setReloadToken((token) => token + 1)}
      />

      <DocumentTable
        workspaceId={workspace.id}
        canEdit={canEdit}
        canContribute={canContribute}
        reloadToken={reloadToken}
      />
    </div>
  );
}

export default DocumentPage;
