import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvitePanel } from './invite-panel';
import * as inviteApi from '../invite-api';

import type { InviteDto } from '../invite-api';
import type { WorkspaceVisibility } from '../workspace-schema';

afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';

function invite(overrides: Partial<InviteDto> = {}): InviteDto {
  return {
    id: 'inv-1',
    token: null,
    role: 'EDITOR',
    createdAt: '2026-11-22T00:00:00Z',
    expiresAt: '2026-11-29T00:00:00Z',
    maxUses: 5,
    usedCount: 2,
    active: true,
    ...overrides,
  };
}

let getInvites: ReturnType<typeof vi.spyOn>;
let revokeInvite: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  getInvites = vi.spyOn(inviteApi, 'getInvites').mockResolvedValue([invite()]);
  revokeInvite = vi.spyOn(inviteApi, 'revokeInvite').mockResolvedValue(undefined);
});

function renderPanel(visibility: WorkspaceVisibility = 'PUBLIC') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InvitePanel workspaceId={WORKSPACE_ID} visibility={visibility} />
    </QueryClientProvider>,
  );
}

describe('InvitePanel', () => {
  it('should list each link with a Vietnamese role and its usage', async () => {
    // Arrange, Act
    renderPanel();

    // Assert
    expect(await screen.findByText('Biên tập viên')).toBeTruthy();
    expect(screen.getByText(/2\/5 lượt/)).toBeTruthy();
  });

  it('should point to the invite dialog for creating links instead of a form', async () => {
    // Arrange, Act
    renderPanel();

    // Assert
    await screen.findByText('Biên tập viên');
    expect(screen.getByText(/Qua link/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Tạo link/ })).toBeNull();
  });

  it('should revoke a link only after the owner confirms', async () => {
    // Arrange
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPanel();

    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }));

    // Assert
    await waitFor(() => expect(revokeInvite).toHaveBeenCalledWith(WORKSPACE_ID, 'inv-1'));
  });

  it('should leave the link alone when the owner cancels', async () => {
    // Arrange
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPanel();

    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }));

    // Assert
    expect(revokeInvite).not.toHaveBeenCalled();
  });

  it('should hide the revoke action on a link that has stopped', async () => {
    // Arrange
    getInvites.mockResolvedValue([invite({ active: false })]);

    // Act
    renderPanel();

    // Assert
    expect(await screen.findByText(/đã ngừng/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Thu hồi' })).toBeNull();
  });

  it('should report a failed revoke in place', async () => {
    // Arrange
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    revokeInvite.mockRejectedValue(new Error(''));
    renderPanel();

    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }));

    // Assert
    expect((await screen.findByRole('alert')).textContent).toBe('Không thu hồi được link');
  });

  it('should say when there are no links yet', async () => {
    // Arrange
    getInvites.mockResolvedValue([]);

    // Act
    renderPanel();

    // Assert
    expect(await screen.findByText('Chưa có link mời nào.')).toBeTruthy();
  });

  it('should explain why a private workspace has no links and not ask the server', () => {
    // Arrange, Act
    renderPanel('PRIVATE');

    // Assert
    expect(screen.getByText(/Nhóm riêng tư không tạo được link mời/)).toBeTruthy();
    expect(getInvites).not.toHaveBeenCalled();
  });
});
