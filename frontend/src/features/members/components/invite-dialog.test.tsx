import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InviteDialog } from './invite-dialog';
import * as copy from '../../../lib/copy-text';
import * as inviteApi from '../../workspaces/invite-api';

afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';

let copyText: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.spyOn(inviteApi, 'createInvite').mockResolvedValue({
    id: 'inv-1', token: 'tok-abc', role: 'VIEWER', createdAt: '', expiresAt: '',
    maxUses: 1, usedCount: 0, active: true,
  });
  vi.spyOn(inviteApi, 'getInvites').mockResolvedValue([]);
  copyText = vi.spyOn(copy, 'copyText').mockResolvedValue(false);
});

function renderDialog(overrides: { onSubmit?: () => void; onClose?: () => void } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = overrides.onClose ?? vi.fn();
  const onSubmit = overrides.onSubmit ?? vi.fn();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <InviteDialog isOpen workspaceId={WORKSPACE_ID} isPending={false} serverError={null}
          onSubmit={onSubmit} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onClose, onSubmit };
}

async function issueLink() {
  await userEvent.click(screen.getByRole('tab', { name: /Qua link/ }));
  await userEvent.click(screen.getByRole('button', { name: /Tạo link mời/ }));
  await screen.findByLabelText('Link mời');
  await waitFor(() => expect(copyText).toHaveBeenCalled());
}

describe('InviteDialog', () => {
  it('should render nothing while closed', () => {
    // Arrange, Act
    const { container } = render(
      <InviteDialog isOpen={false} workspaceId={WORKSPACE_ID} isPending={false}
        serverError={null} onSubmit={vi.fn()} onClose={vi.fn()} />,
    );

    // Assert
    expect(container.innerHTML).toBe('');
  });

  it('should open on the email tab and offer the link tab beside it', () => {
    // Arrange, Act
    renderDialog();

    // Assert
    expect(screen.getByRole('tab', { name: /Qua email/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /Qua link/ })).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('should submit a valid email invite', async () => {
    // Arrange
    const { onSubmit } = renderDialog();

    // Act
    await userEvent.type(screen.getByLabelText('Email'), 'ban@example.com');
    await userEvent.click(screen.getByRole('button', { name: /Gửi lời mời/ }));

    // Assert
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ban@example.com', role: 'VIEWER' });
  });

  it('should refuse an invalid email without submitting', async () => {
    // Arrange
    const { onSubmit } = renderDialog();

    // Act
    await userEvent.type(screen.getByLabelText('Email'), 'khong-phai-email');
    await userEvent.click(screen.getByRole('button', { name: /Gửi lời mời/ }));

    // Assert
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should keep a fresh link when switching tabs and back', async () => {
    // Arrange
    renderDialog();
    await issueLink();

    // Act
    await userEvent.click(screen.getByRole('tab', { name: /Qua email/ }));
    await userEvent.click(screen.getByRole('tab', { name: /Qua link/ }));

    // Assert
    expect(screen.getByLabelText<HTMLInputElement>('Link mời').value).toContain('/invite/tok-abc');
  });

  it('should warn before closing over a link that was not copied', async () => {
    // Arrange
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { onClose } = renderDialog();
    await issueLink();

    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));

    // Assert
    expect(confirm).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should close without asking once the link has been copied', async () => {
    // Arrange
    copyText.mockResolvedValue(true);
    const confirm = vi.spyOn(window, 'confirm');
    const { onClose } = renderDialog();
    await issueLink();
    await screen.findByText(/Đã sao chép link/);

    // Act
    await userEvent.keyboard('{Escape}');

    // Assert
    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should link to the access settings for managing existing links', async () => {
    // Arrange
    renderDialog();

    // Act
    await userEvent.click(screen.getByRole('tab', { name: /Qua link/ }));

    // Assert
    const manage = screen.getByRole('link', { name: /Quản lý link đã tạo/ });
    expect(manage.getAttribute('href')).toBe(`/workspaces/${WORKSPACE_ID}/settings?tab=access`);
  });
});
