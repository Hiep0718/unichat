import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DiscussionPage from './discussion-page';
import * as communityApi from './community-api';
import * as authContext from '../auth/auth-context';
import * as workspaceContext from '../workspaces/workspace-context';
import * as workspaceHooks from '../workspaces/workspace-hooks';

import type { DiscussionPage as DiscussionPageDto } from './community-api';

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
  };
});

/** An empty page: these tests are about the controls, not the list. */
const emptyPage: DiscussionPageDto = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
};

let fetchDiscussions: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchDiscussions = vi
    .spyOn(communityApi, 'fetchDiscussions')
    .mockResolvedValue(emptyPage);

  vi.spyOn(authContext, 'useAuth').mockReturnValue({
    user: { id: 'u1' },
  } as ReturnType<typeof authContext.useAuth>);

  vi.spyOn(workspaceContext, 'useWorkspace').mockReturnValue({
    workspace: null,
    role: 'OWNER',
    isOwner: true,
    canEdit: true,
    canContribute: true,
  });

  vi.spyOn(workspaceHooks, 'useWorkspace').mockReturnValue({
    data: undefined,
  } as ReturnType<typeof workspaceHooks.useWorkspace>);
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DiscussionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The label argument the list query was last called with. */
function lastLabelArg(): string | undefined {
  const calls = fetchDiscussions.mock.calls;
  return calls[calls.length - 1]?.[3] as string | undefined;
}

/** The sort argument the list query was last called with. */
function lastSortArg(): string | undefined {
  const calls = fetchDiscussions.mock.calls;
  return calls[calls.length - 1]?.[4] as string | undefined;
}

describe('Discussion controls', () => {
  it('should offer searching and composing on the same row', () => {
    // Arrange, Act
    renderPage();

    // Assert
    expect(screen.getByLabelText('Tìm bài viết trong nhóm')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tạo bài viết/ })).toBeTruthy();
  });

  it('should start on the newest posts with nothing filtered out', async () => {
    // Arrange, Act
    renderPage();

    // Assert
    await waitFor(() => expect(fetchDiscussions).toHaveBeenCalled());
    expect(lastLabelArg()).toBeUndefined();
    expect(lastSortArg()).toBe('NEW');
    expect(screen.getByRole('button', { name: 'Tất cả' }).getAttribute('aria-pressed'))
      .toBe('true');
  });

  it('should narrow the list to one kind of post when a chip is chosen', async () => {
    // Arrange
    renderPage();
    await waitFor(() => expect(fetchDiscussions).toHaveBeenCalled());

    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Câu hỏi' }));

    // Assert
    await waitFor(() => expect(lastLabelArg()).toBe('QUESTION'));
    expect(screen.getByRole('button', { name: 'Câu hỏi' }).getAttribute('aria-pressed'))
      .toBe('true');
  });

  it('should reorder by what the group engaged with', async () => {
    // Arrange: "Nổi bật" is the server's HOT sort, named for what the reader
    // gets rather than for the parameter.
    renderPage();
    await waitFor(() => expect(fetchDiscussions).toHaveBeenCalled());

    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Nổi bật' }));

    // Assert
    await waitFor(() => expect(lastSortArg()).toBe('HOT'));
  });

  it('should present the two orderings as one control with two positions', () => {
    // Arrange, Act
    renderPage();

    // Assert
    const sort = screen.getByRole('group', { name: 'Sắp xếp bài viết' });
    expect(sort.querySelectorAll('button').length).toBe(2);
    expect(screen.getByRole('button', { name: 'Mới' }).getAttribute('aria-pressed'))
      .toBe('true');
    expect(screen.getByRole('button', { name: 'Nổi bật' }).getAttribute('aria-pressed'))
      .toBe('false');
  });

  it('should wait for a pause before searching rather than query per keystroke', async () => {
    // Arrange
    renderPage();
    await waitFor(() => expect(fetchDiscussions).toHaveBeenCalled());
    const before = fetchDiscussions.mock.calls.length;

    // Act
    await userEvent.type(screen.getByLabelText('Tìm bài viết trong nhóm'), 'index');

    // Assert: five keystrokes must not be five requests.
    expect(fetchDiscussions.mock.calls.length).toBe(before);
    await waitFor(
      () => expect(fetchDiscussions.mock.calls.length).toBeGreaterThan(before),
      { timeout: 2000 },
    );
  });
});
