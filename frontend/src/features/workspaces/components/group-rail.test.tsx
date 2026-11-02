import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GroupRail } from './group-rail';

import type { WorkspaceFace } from '../workspace-schema';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';

const faces: readonly WorkspaceFace[] = [
  { userId: 'u1', displayName: 'Phi Hùng', hasAvatar: false, avatarColor: 'moss' },
  { userId: 'u2', displayName: 'Trang', hasAvatar: false, avatarColor: 'teal' },
];

function renderRail(overrides: { faces?: readonly WorkspaceFace[]; memberCount?: number } = {}) {
  return render(
    <MemoryRouter>
      <GroupRail
        workspaceId={WORKSPACE_ID}
        faces={overrides.faces ?? faces}
        memberCount={overrides.memberCount ?? 3}
      />
    </MemoryRouter>,
  );
}

describe('GroupRail', () => {
  it('should invite the reader to ask the group assistant', () => {
    // Arrange, Act
    renderRail();

    // Assert
    expect(screen.getByText('Hỏi trợ lý của nhóm')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bắt đầu hỏi/ })).toBeTruthy();
  });

  it('should open the group assistant when the reader starts asking', async () => {
    // Arrange
    navigate.mockClear();
    renderRail();

    // Act
    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu hỏi/ }));

    // Assert
    expect(navigate).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/chat`);
  });

  it('should promise citations without claiming a number of ready files', () => {
    // Arrange, Act: the group endpoint reports only a total, and a file still
    // being ingested is not one the assistant can read, so a count here would
    // undercut the card's own claim that the answers are grounded.
    renderRail();

    // Assert
    expect(screen.getByText(/kèm trích dẫn nguồn/)).toBeTruthy();
    expect(screen.queryByText(/tệp đã sẵn sàng/)).toBeNull();
  });

  it('should show the members and link to the full list', () => {
    // Arrange, Act
    renderRail();

    // Assert
    const link = screen.getByRole('link', { name: 'Xem tất cả' });
    expect(link.getAttribute('href')).toBe(`/workspaces/${WORKSPACE_ID}/members`);
    expect(screen.getByTitle('Phi Hùng')).toBeTruthy();
    expect(screen.getByTitle('Trang')).toBeTruthy();
  });

  it('should count the members the faces do not show', () => {
    // Arrange, Act: two faces of three members leaves one unshown.
    renderRail({ memberCount: 3 });

    // Assert
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('should still offer the full list while the faces are loading', () => {
    // Arrange, Act: the rail renders before the group query resolves, and an
    // empty face row must not take the way to the members tab with it.
    renderRail({ faces: [], memberCount: 0 });

    // Assert
    expect(screen.getByRole('link', { name: 'Xem tất cả' })).toBeTruthy();
  });
});
