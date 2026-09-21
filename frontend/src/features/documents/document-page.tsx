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

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Tài liệu — {workspace.name}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
          Quản lý tệp PDF, DOCX và TXT phục vụ tìm kiếm và suy luận tri thức Adaptive RAG.
        </p>
      </header>

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
