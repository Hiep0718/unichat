import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import { WorkspaceProvider, WorkspaceDetails } from '../features/workspaces/workspace-context';
import { fetchWorkspace } from '../features/workspaces/workspace-api';
import { LoadingScreen } from '../components/loading-screen';
import { AppShell } from './app-shell';

/**
 * Shell component for workspace-scoped routes.
 * Fetches workspace metadata, sets up WorkspaceContext, and renders AppShell layout.
 */
export function WorkspaceShell() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspace, setWorkspace] = useState<WorkspaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    let mounted = true;

    fetchWorkspace(workspaceId)
      .then((data) => {
        if (mounted) {
          const details: WorkspaceDetails = {
            id: data.id,
            name: data.name,
            visibility: data.visibility,
            role: data.userRole ?? 'VIEWER',
          };
          if (data.description !== undefined) {
            (details as { description?: string }).description = data.description;
          }
          if (data.ownerId !== undefined) {
            (details as { ownerId?: string }).ownerId = data.ownerId;
          }
          setWorkspace(details);
        }
      })
      .catch((err: Error) => {
        if (mounted) {
          setError(err.message || 'Không thể tải thông tin Workspace');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  if (loading) {
    return <LoadingScreen message="Đang tải thông tin Workspace..." />;
  }

  if (error || !workspace) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center', padding: '2rem' }}>
        <div>
          <h2 style={{ marginBottom: '1rem', color: '#e11d48' }}>{error || 'Workspace không tồn tại'}</h2>
          <p style={{ marginBottom: '1.5rem', color: '#64748b' }}>Bạn không có quyền truy cập hoặc Workspace đã bị xóa.</p>
          <Link to="/workspaces" style={{ padding: '0.625rem 1.25rem', background: '#0284c7', color: '#fff', borderRadius: '0.375rem', textDecoration: 'none' }}>
            Quay lại danh sách Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider workspace={workspace}>
      <AppShell />
    </WorkspaceProvider>
  );
}
