import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InviteLinkCreator } from './invite-link-creator';
import * as copy from '../../../lib/copy-text';
import * as inviteApi from '../invite-api';

import type { InviteDto } from '../invite-api';

afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';

function invite(overrides: Partial<InviteDto> = {}): InviteDto {
  return {
    id: 'inv-1',
    token: 'tok-abc',
    role: 'VIEWER',
    createdAt: '2026-11-22T00:00:00Z',
    expiresAt: '2026-11-29T00:00:00Z',
    maxUses: 1,
    usedCount: 0,
    active: true,
    ...overrides,
  };
}

let createInvite: ReturnType<typeof vi.spyOn>;
let copyText: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  createInvite = vi.spyOn(inviteApi, 'createInvite').mockResolvedValue(invite());
  vi.spyOn(inviteApi, 'getInvites').mockResolvedValue([]);
  copyText = vi.spyOn(copy, 'copyText').mockResolvedValue(true);
});

function renderCreator(onUncopiedChange: (pending: boolean) => void = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InviteLinkCreator workspaceId={WORKSPACE_ID} onUncopiedChange={onUncopiedChange} />
    </QueryClientProvider>,
  );
}

describe('InviteLinkCreator', () => {
  it('should issue a viewer link for 7 days and 1 use with a single click', async () => {
    // Arrange
    renderCreator();

    // Act
    await userEvent.click(screen.getByRole('button', { name: /Tạo link mời/ }));

    // Assert
    await waitFor(() => expect(createInvite).toHaveBeenCalledWith(WORKSPACE_ID, {
      role: 'VIEWER', expiresInDays: 7, maxUses: 1,
    }));
  });

  it('should copy the new link straight away and say so', async () => {
    // Arrange
    renderCreator();

    // Act
    await userEvent.click(screen.getByRole('button', { name: /Tạo link mời/ }));

    // Assert
    const field = await screen.findByLabelText<HTMLInputElement>('Link mời');
    expect(field.value).toBe(`${window.location.origin}/invite/tok-abc`);
    await waitFor(() => expect(screen.getByText(/Đã sao chép link/)).toBeTruthy());
    expect(copyText).toHaveBeenCalledWith(field.value, field);
  });

  it('should tell the owner to copy by hand when automatic copy fails', async () => {
    // Arrange
    copyText.mockResolvedValue(false);
    const onUncopied = vi.fn();
    renderCreator(onUncopied);

    // Act
    await userEvent.click(screen.getByRole('button', { name: /Tạo link mời/ }));

    // Assert
    await waitFor(() => expect(screen.getByText(/Chưa sao chép được tự động/)).toBeTruthy());
    expect(onUncopied).toHaveBeenLastCalledWith(true);
  });

  it('should clear the pending warning once the owner copies manually', async () => {
    // Arrange
    copyText.mockResolvedValueOnce(false).mockResolvedValue(true);
    const onUncopied = vi.fn();
    renderCreator(onUncopied);
    await userEvent.click(screen.getByRole('button', { name: /Tạo link mời/ }));
    await screen.findByText(/Chưa sao chép được tự động/);

    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Sao chép' }));

    // Assert
    await waitFor(() => expect(onUncopied).toHaveBeenLastCalledWith(false));
    expect(screen.getByRole('button', { name: 'Đã chép' })).toBeTruthy();
  });

  it('should keep the use limit within 1 to 200', async () => {
    // Arrange
    renderCreator();
    await userEvent.click(screen.getByText('Tùy chọn nâng cao'));
    const uses = screen.getByRole('spinbutton');

    // Act
    fireEvent.change(uses, { target: { value: '999' } });
    await userEvent.click(screen.getByRole('button', { name: /Tạo link mời/ }));

    // Assert
    await waitFor(() => expect(createInvite).toHaveBeenCalledWith(
      WORKSPACE_ID, expect.objectContaining({ maxUses: 200 }),
    ));
  });

  it('should show the server message when issuing fails', async () => {
    // Arrange
    createInvite.mockRejectedValue(new Error('Nhóm riêng tư không tạo được link mời'));
    renderCreator();

    // Act
    await userEvent.click(screen.getByRole('button', { name: /Tạo link mời/ }));

    // Assert
    expect((await screen.findByRole('alert')).textContent).toContain('Nhóm riêng tư');
    expect(screen.queryByLabelText('Link mời')).toBeNull();
  });
});
