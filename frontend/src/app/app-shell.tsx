/**
 * Responsive application shell with sidebar and main content area (UI Spec §3).
 */

import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';

import { SideNavBar } from '../components/side-nav-bar';
import { CoverAssignmentProvider } from '../features/workspaces/cover-assignment';
import { useWorkspaces } from '../features/workspaces/workspace-hooks';
import './app-shell.css';

/**
 * Layout wrapper for authenticated pages.
 * Renders sidebar navigation and delegates content to nested routes.
 */
export function AppShell() {
  const { data } = useWorkspaces();

  // Which picture each group wears is decided here rather than per page,
  // because the rail and the page are on screen together: a group drawn one
  // colour in the rail and another in the feed would be worse than the
  // duplicates this replaces. The rail already loads this list, and React
  // Query hands the pages the same copy of it.
  const workspaceIds = useMemo(
    () => (data?.content ?? []).map((workspace) => workspace.id),
    [data?.content],
  );

  return (
    <CoverAssignmentProvider workspaceIds={workspaceIds}>
      <div className="app-shell">
        <SideNavBar />
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </CoverAssignmentProvider>
  );
}
