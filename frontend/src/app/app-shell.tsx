/**
 * Responsive application shell with sidebar and main content area (UI Spec §3).
 */

import { Outlet } from 'react-router-dom';
import { SideNavBar } from '../components/side-nav-bar';
import './app-shell.css';

/**
 * Layout wrapper for authenticated pages.
 * Renders sidebar navigation and delegates content to nested routes.
 */
export function AppShell() {
  return (
    <div className="app-shell">
      <SideNavBar />
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
