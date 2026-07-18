/**
 * Responsive application shell with sidebar and main content area (UI Spec §3).
 */

import { Outlet } from 'react-router-dom';
import { SideNavBar } from '../components/side-nav-bar';

/**
 * Layout wrapper for authenticated pages.
 * Renders sidebar navigation and delegates content to nested routes.
 */
export function AppShell() {
  return (
    <div className="app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <SideNavBar />
      <main className="app-shell__main" style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
