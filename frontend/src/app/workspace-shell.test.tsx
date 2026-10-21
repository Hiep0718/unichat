import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceSettingsPage } from '../features/settings/settings-page';
import { getWorkspace, updateWorkspace } from '../features/workspaces/workspace-api';
import { useWorkspace } from '../features/workspaces/workspace-context';
import { applyWorkspaceUpdateFixture } from '../features/workspaces/workspace-test-fixtures';
import { WorkspaceShell } from './workspace-shell';

import type { WorkspaceDto } from '../features/workspaces/workspace-schema';

vi.mock('../features/workspaces/workspace-api', () => ({ getWorkspace: vi.fn(), updateWorkspace: vi.fn() }));
vi.mock('../features/members/components/member-table', () => ({ MemberTable: () => null }));
vi.mock('./app-shell', () => ({ AppShell: () => <><ContextSnapshot /><WorkspaceSettingsPage /></> }));

const WORKSPACE: WorkspaceDto = {
  id: 'workspace-1', ownerId: 'owner-1', name: 'Nhóm nghiên cứu', description: '', visibility: 'PRIVATE',
  cloudAllowed: false, version: 3, userRole: 'OWNER', documentCount: 0, memberCount: 1, recentPostCount: 0,
  faces: [], hasCover: false, createdAt: '', updatedAt: '',
};

function ContextSnapshot() {
  const { workspace } = useWorkspace();
  return <output data-testid="context-snapshot">{JSON.stringify(workspace)}</output>;
}

function renderShell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={['/workspaces/workspace-1/settings']}>
      <Routes><Route path="/workspaces/:workspaceId/settings" element={<WorkspaceShell />} /></Routes>
    </MemoryRouter>
  </QueryClientProvider>);
  return userEvent.setup();
}

beforeEach(() => {
  vi.mocked(getWorkspace).mockResolvedValue(WORKSPACE);
  vi.mocked(updateWorkspace).mockImplementation(async (_id, input) => (
    applyWorkspaceUpdateFixture(WORKSPACE, input)
  ));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('WorkspaceShell', () => {
  it('should preserve AI policy and version in context and use returned metadata on subsequent tabs', async () => {
    const user = renderShell();
    await user.click(await screen.findByRole('tab', { name: 'AI & Quyền riêng tư' }));
    expect(screen.getByTestId('context-snapshot')).toHaveTextContent('"cloudAllowed":false');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Lưu quyền AI' }));
    await waitFor(() => expect(screen.getByTestId('context-snapshot')).toHaveTextContent('"version":4'));
    expect(screen.getByTestId('context-snapshot')).toHaveTextContent('"cloudAllowed":true');
    await user.click(screen.getByRole('tab', { name: 'Thông tin chung' }));
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(updateWorkspace).toHaveBeenCalledTimes(2));
    expect(updateWorkspace).toHaveBeenLastCalledWith(WORKSPACE.id, { name: WORKSPACE.name, description: '', expectedVersion: 4 });
    await waitFor(() => expect(screen.getByTestId('context-snapshot')).toHaveTextContent('"version":5'));
    await user.click(screen.getByRole('tab', { name: 'Quyền truy cập & Thành viên' }));
    await user.click(screen.getByRole('radio', { name: /Chia sẻ/ }));
    await user.click(screen.getByRole('button', { name: 'Cập nhật chế độ hiển thị' }));
    await waitFor(() => expect(updateWorkspace).toHaveBeenCalledTimes(3));
    expect(updateWorkspace).toHaveBeenLastCalledWith(WORKSPACE.id, { visibility: 'SHARED', expectedVersion: 5 });
  });

  it('should render the current workspace role as a read-only AI setting for an editor', async () => {
    vi.mocked(getWorkspace).mockResolvedValue({ ...WORKSPACE, userRole: 'EDITOR' });
    const user = renderShell();
    await user.click(await screen.findByRole('tab', { name: 'AI & Quyền riêng tư' }));
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.queryByRole('tab', { name: 'Vùng nguy hiểm' })).not.toBeInTheDocument();
    expect(updateWorkspace).not.toHaveBeenCalled();
  });

  it('should show a safe error when workspace metadata cannot be loaded', async () => {
    vi.mocked(getWorkspace).mockRejectedValue(new Error('Private server detail'));
    renderShell();
    expect(await screen.findByText('Không thể tải thông tin Workspace')).toBeVisible();
    expect(screen.queryByText('Private server detail')).not.toBeInTheDocument();
  });
});
