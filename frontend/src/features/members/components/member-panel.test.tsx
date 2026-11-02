import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberPanel } from './member-panel';
import * as authContext from '../../auth/auth-context';
import * as memberApi from '../member-api';

import type { MemberDto } from '../member-schema';
import type { WorkspaceVisibility } from '../../workspaces/workspace-schema';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const ME = 'me-0001';

function member(overrides: Partial<MemberDto> = {}): MemberDto {
  return {
    userId: 'u-other',
    email: 'taolahieptqn122@gmail.com',
    displayName: 'taolahieptqn122',
    hasAvatar: false,
    avatarColor: null,
    role: 'VIEWER',
    status: 'ACTIVE',
    invitedById: ME,
    ...overrides,
  };
}

const owner = member({
  userId: ME,
  email: 'hungdz1372004@gmail.com',
  displayName: 'hungdz1372004',
  role: 'OWNER',
});

let getMembers: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // getMembers is typed by the response, which also carries workspaceId.
  getMembers = vi.spyOn(memberApi, 'getMembers')
    .mockResolvedValue([owner, member()].map((m) => ({ ...m, workspaceId: WORKSPACE_ID })));
  vi.spyOn(authContext, 'useAuth').mockReturnValue({
    user: { id: ME },
  } as ReturnType<typeof authContext.useAuth>);
});

function renderPanel(
  options: { isOwner?: boolean; visibility?: WorkspaceVisibility | undefined } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MemberPanel
          workspaceId={WORKSPACE_ID}
          isOwner={options.isOwner ?? true}
          visibility={'visibility' in options ? options.visibility : 'PUBLIC'}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MemberPanel', () => {
  it('should head the card with how many members there are', async () => {
    // Arrange, Act
    renderPanel();

    // Assert
    await waitFor(() => expect(screen.getByText('(2)')).toBeTruthy());
    expect(screen.getByText('Thành viên')).toBeTruthy();
  });

  it('should name each role in Vietnamese rather than the stored value', async () => {
    // Arrange, Act
    renderPanel();

    // Assert: the previous table printed "OWNER" and "VIEWER" straight from
    // the response.
    await waitFor(() => expect(screen.getByText('Chủ sở hữu')).toBeTruthy());
    expect(screen.queryByText('OWNER')).toBeNull();
    expect(screen.queryByText('VIEWER')).toBeNull();
  });

  it('should mark the viewer’s own row', async () => {
    // Arrange, Act
    renderPanel();

    // Assert
    await waitFor(() => expect(screen.getByText('Bạn')).toBeTruthy());
  });

  it('should not offer to remove the owner', async () => {
    // Arrange, Act: a group without an owner is a group nobody can administer.
    renderPanel();

    // Assert
    await waitFor(() => expect(screen.getByText('Chủ sở hữu')).toBeTruthy());
    expect(screen.queryByLabelText(`Gỡ ${owner.email} khỏi nhóm`)).toBeNull();
    expect(screen.getByLabelText('Gỡ taolahieptqn122@gmail.com khỏi nhóm')).toBeTruthy();
  });

  it('should leave a non-owner no way to change anyone', async () => {
    // Arrange, Act
    renderPanel({ isOwner: false });

    // Assert
    await waitFor(() => expect(screen.getByText('Chủ sở hữu')).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Mời thành viên/ })).toBeNull();
    expect(screen.queryByLabelText(/khỏi nhóm$/)).toBeNull();
  });

  it('should ask before removing someone, and do nothing if refused', async () => {
    // Arrange
    const removeMember = vi.spyOn(memberApi, 'removeMember').mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPanel();
    await waitFor(() => expect(screen.getByText('Chủ sở hữu')).toBeTruthy());

    // Act
    await userEvent.click(screen.getByLabelText('Gỡ taolahieptqn122@gmail.com khỏi nhóm'));

    // Assert
    expect(window.confirm).toHaveBeenCalled();
    expect(removeMember).not.toHaveBeenCalled();
  });

  it('should report a failed removal in the card rather than through a dialog', async () => {
    // Arrange: the previous implementation called alert(), which interrupts to
    // say something the list could have said in place.
    vi.spyOn(memberApi, 'removeMember').mockRejectedValue(new Error('Không gỡ được thành viên'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    renderPanel();
    await waitFor(() => expect(screen.getByText('Chủ sở hữu')).toBeTruthy());

    // Act
    await userEvent.click(screen.getByLabelText('Gỡ taolahieptqn122@gmail.com khỏi nhóm'));

    // Assert
    await waitFor(() => expect(screen.getByRole('alert').textContent)
      .toContain('Không gỡ được thành viên'));
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

/* Behaviour carried over from the table this panel replaces. */
describe('MemberPanel visibility guidance', () => {
  it('should offer the invite button on a shared workspace', async () => {
    // Arrange, Act
    renderPanel({ visibility: 'SHARED' });

    // Assert
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Mời thành viên/ })).toBeTruthy());
  });

  it('should replace the invite button with a way out on a private workspace', async () => {
    // Arrange, Act
    renderPanel({ visibility: 'PRIVATE' });

    // Assert
    await waitFor(() => expect(screen.getByText(/chỉ mình bạn truy cập được/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Mời thành viên/ })).toBeNull();
    expect(screen.getByRole('link', { name: /chuyển sang chế độ Chia sẻ/ })).toBeTruthy();
  });

  it('should not nag a member who could not invite anyone anyway', async () => {
    // Arrange, Act
    renderPanel({ isOwner: false, visibility: 'PRIVATE' });

    // Assert
    await waitFor(() => expect(getMembers).toHaveBeenCalled());
    expect(screen.queryByText(/chỉ mình bạn truy cập được/)).toBeNull();
  });

  it('should keep the invite button when the level is not known to the caller', async () => {
    // Arrange, Act: the Core API refuses the request either way; this only
    // spares the owner the round trip when the level is to hand.
    renderPanel({ visibility: undefined });

    // Assert
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Mời thành viên/ })).toBeTruthy());
  });
});
