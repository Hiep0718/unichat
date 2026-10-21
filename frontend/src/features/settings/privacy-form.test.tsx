import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/api-client';
import { getWorkspace, updateWorkspace } from '../workspaces/workspace-api';
import { useWorkspace } from '../workspaces/workspace-hooks';
import { applyWorkspaceUpdateFixture } from '../workspaces/workspace-test-fixtures';
import { PrivacyForm } from './privacy-form';

import type { WorkspaceDto } from '../workspaces/workspace-schema';

vi.mock('../workspaces/workspace-api', () => ({ getWorkspace: vi.fn(), updateWorkspace: vi.fn() }));

const WORKSPACE: WorkspaceDto = {
  id: 'workspace-1', ownerId: 'owner-1', name: 'Nhóm nghiên cứu', description: '', visibility: 'PRIVATE',
  cloudAllowed: false, version: 3, userRole: 'OWNER', documentCount: 0, memberCount: 1, recentPostCount: 0,
  faces: [], hasCover: false, createdAt: '', updatedAt: '',
};

function PolicyHarness({ isOwner }: { readonly isOwner: boolean }) {
  const { data } = useWorkspace(WORKSPACE.id);
  return data ? <PrivacyForm workspace={data} isOwner={isOwner} /> : null;
}

function renderPolicy(isOwner = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  queryClient.setQueryData(['workspaces', 'detail', WORKSPACE.id], WORKSPACE);
  render(<QueryClientProvider client={queryClient}><PolicyHarness isOwner={isOwner} /></QueryClientProvider>);
  return { queryClient, user: userEvent.setup() };
}

beforeEach(() => {
  vi.mocked(getWorkspace).mockResolvedValue(WORKSPACE);
  vi.mocked(updateWorkspace).mockImplementation(async (_id, input) => (
    applyWorkspaceUpdateFixture(WORKSPACE, input)
  ));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PrivacyForm', () => {
  it('should retain disabled policy until the owner explicitly saves', async () => {
    const { user } = renderPolicy();
    expect(screen.getByRole('checkbox', { name: 'Cho phép xử lý bằng AI' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Lưu quyền AI' })).toBeDisabled();
    expect(updateWorkspace).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox'));
    expect(updateWorkspace).not.toHaveBeenCalled();
    expect(screen.getByText('Trạng thái đã lưu: Chưa cho phép')).toBeVisible();
  });

  it('should save enable and disable with the latest returned version and refresh the cache', async () => {
    const { user, queryClient } = renderPolicy();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Lưu quyền AI' }));
    await waitFor(() => expect(screen.getByText('Trạng thái đã lưu: Đã cho phép')).toBeVisible());
    expect(updateWorkspace).toHaveBeenNthCalledWith(1, WORKSPACE.id, { cloudAllowed: true, expectedVersion: 3 });
    expect(queryClient.getQueryData<WorkspaceDto>(['workspaces', 'detail', WORKSPACE.id])?.version).toBe(4);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Lưu quyền AI' }));
    await waitFor(() => expect(screen.getByText('Trạng thái đã lưu: Chưa cho phép')).toBeVisible());
    expect(updateWorkspace).toHaveBeenNthCalledWith(2, WORKSPACE.id, { cloudAllowed: false, expectedVersion: 4 });
  });

  it.each(['EDITOR', 'VIEWER'])('should block policy changes for %s', async () => {
    const { user } = renderPolicy(false);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Lưu quyền AI' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    expect(updateWorkspace).not.toHaveBeenCalled();
  });

  it('should refresh a conflict without claiming success or automatically retrying', async () => {
    vi.mocked(updateWorkspace).mockRejectedValue(new ApiError(409, 'Private upstream detail'));
    vi.mocked(getWorkspace).mockResolvedValue({ ...WORKSPACE, version: 4 });
    const { user } = renderPolicy();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Lưu quyền AI' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Workspace đã thay đổi');
    expect(screen.queryByText('Đã lưu quyền xử lý bằng AI.')).not.toBeInTheDocument();
    expect(screen.getByText('Trạng thái đã lưu: Chưa cho phép')).toBeVisible();
    expect(screen.queryByText('Private upstream detail')).not.toBeInTheDocument();
    await waitFor(() => expect(getWorkspace).toHaveBeenCalled());
    expect(updateWorkspace).toHaveBeenCalledTimes(1);
  });

  it('should report a friendly permission failure and preserve the saved policy', async () => {
    vi.mocked(updateWorkspace).mockRejectedValue(new ApiError(403, 'Private ACL details'));
    const { user } = renderPolicy();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Lưu quyền AI' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền');
    expect(screen.getByText('Trạng thái đã lưu: Chưa cho phép')).toBeVisible();
  });
});
