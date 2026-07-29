import { useWorkspace } from '../workspaces/workspace-context';
import { DocumentTable } from './components/document-table';

export function DocumentPage() {
  const { workspace, canEdit } = useWorkspace();

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

      <DocumentTable workspaceId={workspace.id} canEdit={canEdit} />
    </div>
  );
}

export default DocumentPage;
