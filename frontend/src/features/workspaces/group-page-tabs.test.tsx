import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GroupPage } from './group-page';
import * as workspaceContext from './workspace-context';
import * as workspaceHooks from './workspace-hooks';

import type { WorkspaceDto } from './workspace-schema';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ workspaceId: WORKSPACE_ID }),
    Outlet: () => null,
  };
});

// The cover fetches a blob; the tabs are what these tests are about.
vi.mock('./components/cover-banner', () => ({
  CoverBanner: () => null,
}));

// Reads a pending-approval count of its own, which these tests do not drive.
vi.mock('../documents/components/pending-approval-badge', () => ({
  PendingApprovalBadge: () => null,
}));

function details(overrides: Partial<WorkspaceDto> = {}): WorkspaceDto {
  return {
    id: WORKSPACE_ID,
    ownerId: 'u1',
    name: 'Mongodb',
    description: '',
    visibility: 'PUBLIC',
    cloudAllowed: false,
    documentCount: 6,
    memberCount: 3,
    recentPostCount: 0,
    postCount: 3,
    faces: [],
    topics: [],
    hasCover: false,
    version: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    userRole: 'OWNER',
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(workspaceContext, 'useWorkspace').mockReturnValue({
    workspace: {
      id: WORKSPACE_ID,
      name: 'Mongodb',
      description: '',
      visibility: 'PUBLIC',
      topics: [],
      role: 'OWNER',
      cloudAllowed: false,
      version: 0,
    },
    role: 'OWNER',
    isOwner: true,
    canEdit: true,
    canContribute: true,
  });
});

function renderPage(data: WorkspaceDto | undefined) {
  vi.spyOn(workspaceHooks, 'useWorkspace').mockReturnValue({
    data,
  } as ReturnType<typeof workspaceHooks.useWorkspace>);

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GroupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The tab link carrying the given name, so its count can be read from it. */
function tab(name: string): HTMLElement {
  return screen.getByRole('link', { name: new RegExp(`^${name}`) });
}

describe('Group page tabs', () => {
  it('should say how much is in each tab', () => {
    // Arrange, Act
    renderPage(details());

    // Assert
    expect(tab('Bài viết').textContent).toContain('3');
    expect(tab('Tệp').textContent).toContain('6');
    expect(tab('Thành viên').textContent).toContain('3');
  });

  it('should count every post, not only the ones from this week', () => {
    // Arrange, Act: a group with 200 posts and a quiet week is not a group
    // with no posts, which is what recentPostCount would have read as.
    renderPage(details({ postCount: 200, recentPostCount: 0 }));

    // Assert
    expect(tab('Bài viết').textContent).toContain('200');
  });

  it('should leave an empty tab unnumbered', () => {
    // Arrange, Act: "Tệp 0" is a heavier way of saying what the empty tab
    // already says once opened.
    renderPage(details({ documentCount: 0 }));

    // Assert
    expect(tab('Tệp').textContent).not.toContain('0');
  });

  it('should never number the description tab', () => {
    // Arrange, Act: a description is one thing or nothing, so a count there
    // would say less than the word alone.
    renderPage(details());

    // Assert
    expect(tab('Giới thiệu').querySelector('.group-tab__count')).toBeNull();
    expect(tab('Bài viết').querySelector('.group-tab__count')).not.toBeNull();
  });

  it('should name every tab before the group has loaded', () => {
    // Arrange, Act: the counts arrive with the query, and the names must not
    // wait for them.
    renderPage(undefined);

    // Assert
    expect(tab('Bài viết')).toBeTruthy();
    expect(tab('Tệp')).toBeTruthy();
    expect(tab('Thành viên')).toBeTruthy();
    expect(tab('Giới thiệu')).toBeTruthy();
  });
});
