import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

import { LoadingScreen } from '../components/loading-screen';
import { WorkspaceProvider } from '../features/workspaces/workspace-context';
import { useWorkspace } from '../features/workspaces/workspace-hooks';
import { AppShell } from './app-shell';

/** Fetches workspace metadata from the shared query cache for workspace routes. */
export function WorkspaceShell() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const { data: workspace, isLoading, error } = useWorkspace(workspaceId);

  useEffect(() => {
    if (workspaceId) rememberWorkspace(workspaceId);
  }, [workspaceId]);

  if (isLoading) return <LoadingScreen message="Đang tải thông tin Workspace..." />;
  if (error || !workspace) return <WorkspaceUnavailable />;

  return (
    <WorkspaceProvider workspace={{ ...workspace, role: workspace.userRole ?? 'VIEWER' }}>
      <AppShell />
    </WorkspaceProvider>
  );
}

function rememberWorkspace(workspaceId: string): void {
  try {
    localStorage.setItem('unichat_active_workspace_id', workspaceId);
  } catch {
    // Remembering the last route is optional when browser storage is restricted.
  }
}

function WorkspaceUnavailable() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div>
        <h2>Không thể tải thông tin Workspace</h2>
        <p>Bạn không có quyền truy cập hoặc Workspace đã bị xóa.</p>
        <Link to="/workspaces">Quay lại danh sách Workspace</Link>
      </div>
    </div>
  );
}
