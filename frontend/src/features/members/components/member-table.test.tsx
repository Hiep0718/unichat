import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberTable } from './member-table';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

vi.mock('../member-api', () => ({
  fetchWorkspaceMembers: vi.fn(),
  addWorkspaceMember: vi.fn(),
  updateWorkspaceMemberRole: vi.fn(),
  removeWorkspaceMember: vi.fn(),
}));

const { fetchWorkspaceMembers } = await import('../member-api');

const WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';

function renderTable(props: Partial<Parameters<typeof MemberTable>[0]> = {}) {
  return render(
    <MemoryRouter>
      <MemberTable workspaceId={WORKSPACE_ID} isOwner {...props} />
    </MemoryRouter>,
  );
}

describe('MemberTable visibility guidance', () => {
  beforeEach(() => {
    vi.mocked(fetchWorkspaceMembers).mockResolvedValue([
      {
        workspaceId: WORKSPACE_ID,
        userId: '22222222-2222-2222-2222-222222222222',
        email: 'owner@unichat.edu.vn',
        role: 'OWNER',
        status: 'ACTIVE',
        invitedById: '22222222-2222-2222-2222-222222222222',
      },
    ]);
  });

  it('should offer the invite button on a shared workspace', async () => {
    renderTable({ visibility: 'SHARED' });

    expect(await screen.findByRole('button', { name: /Thêm thành viên/ })).toBeInTheDocument();
  });

  it('should replace the invite button with a way out on a private workspace', async () => {
    renderTable({ visibility: 'PRIVATE' });

    // Arriving at a disabled-looking screen with no explanation is the failure
    // this guards: the owner is told why, and handed the route that fixes it.
    expect(await screen.findByText(/Riêng tư/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thêm thành viên/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /chuyển sang chế độ Chia sẻ/i })).toHaveAttribute(
      'href',
      `/workspaces/${WORKSPACE_ID}/settings?tab=access`,
    );
  });

  it('should not nag a member who could not invite anyone anyway', async () => {
    renderTable({ visibility: 'PRIVATE', isOwner: false });

    await screen.findByText('owner@unichat.edu.vn');
    expect(screen.queryByText(/chuyển sang chế độ Chia sẻ/i)).not.toBeInTheDocument();
  });

  it('should keep the invite button when the level is not known to the caller', async () => {
    renderTable();

    expect(await screen.findByRole('button', { name: /Thêm thành viên/ })).toBeInTheDocument();
  });
});
