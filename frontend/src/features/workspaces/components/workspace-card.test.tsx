import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceCard } from './workspace-card';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

URL.createObjectURL = vi.fn(() => 'blob:mock');
URL.revokeObjectURL = vi.fn();

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Mongodb',
  visibility: 'PUBLIC' as const,
  documentCount: 6,
  memberCount: 3,
  recentPostCount: 0,
  faces: [
    { userId: 'u1', displayName: 'Hùng', hasAvatar: false, avatarColor: 'navy' },
    { userId: 'u2', displayName: 'Thanh', hasAvatar: false, avatarColor: null },
  ],
  hasCover: false,
  updatedAt: new Date().toISOString(),
};

function renderCard(props: Partial<typeof base> = {}) {
  return render(
    <MemoryRouter>
      <WorkspaceCard {...base} {...props} />
    </MemoryRouter>,
  );
}

describe('WorkspaceCard', () => {
  it('should show the documents the group really has', () => {
    // Arrange and Act: the count was a hardcoded 0 on every card before.
    renderCard({ documentCount: 6 });

    // Assert
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('should say what happened this week when the group is active', () => {
    // Arrange and Act
    renderCard({ recentPostCount: 2 });

    // Assert
    expect(screen.getByText(/2 bài tuần này/)).toBeInTheDocument();
  });

  it('should fall back to when it last changed for a quiet group', () => {
    // Arrange and Act: a group with a long history and a quiet week should
    // not claim activity it does not have.
    renderCard({ recentPostCount: 0 });

    // Assert
    expect(screen.queryByText(/bài tuần này/)).not.toBeInTheDocument();
  });

  it('should keep every card the same shape so a row of titles lines up', () => {
    // Arrange: cards used to carry a description, so a group that had one
    // pushed its title above its neighbours' and the row read as crooked.
    const { container } = renderCard();

    // Assert
    expect(container.querySelector('.workspace-card__desc')).not.toBeInTheDocument();
  });

  it('should name the members rather than only counting them', () => {
    // Arrange and Act
    renderCard();

    // Assert: a count says how big a group is, a face says whose it is.
    expect(screen.getByTitle('Hùng')).toBeInTheDocument();
    expect(screen.getByTitle('Thanh')).toBeInTheDocument();
  });

  it('should summarise the members it did not draw', () => {
    // Arrange: two faces returned for a group of nine.
    renderCard({ memberCount: 9 });

    // Assert
    expect(screen.getByText('+7')).toBeInTheDocument();
  });

  it('should link to the group it shows', () => {
    // Arrange and Act
    const { container } = renderCard();

    // Assert
    expect(container.querySelector('a')).toHaveAttribute(
      'href',
      `/workspaces/${base.id}`,
    );
  });
});
