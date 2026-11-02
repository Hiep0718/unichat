import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GroupAboutTab } from './group-about-tab';
import * as workspaceContext from '../workspace-context';
import * as workspaceHooks from '../workspace-hooks';

import type { WorkspaceDto } from '../workspace-schema';
import type { WorkspaceDetails } from '../workspace-context';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ workspaceId: WORKSPACE_ID }) };
});

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
    topics: ['DATABASE'],
    hasCover: false,
    version: 0,
    createdAt: '2026-09-07T00:00:00Z',
    updatedAt: '2026-09-07T00:00:00Z',
    userRole: 'OWNER',
    ...overrides,
  };
}

function givenWorkspace(description: string, isOwner = true) {
  const workspace: WorkspaceDetails = {
    id: WORKSPACE_ID,
    name: 'Mongodb',
    description,
    visibility: 'PUBLIC',
    topics: ['DATABASE'],
    role: isOwner ? 'OWNER' : 'VIEWER',
    cloudAllowed: false,
    version: 0,
  };
  vi.spyOn(workspaceContext, 'useWorkspace').mockReturnValue({
    workspace,
    role: workspace.role,
    isOwner,
    canEdit: isOwner,
    canContribute: true,
  });
}

beforeEach(() => {
  vi.spyOn(workspaceHooks, 'useWorkspace').mockReturnValue({
    data: details(),
  } as ReturnType<typeof workspaceHooks.useWorkspace>);
});

function renderTab() {
  // The topic chips fetch the shared topic vocabulary of their own accord.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GroupAboutTab />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GroupAboutTab description', () => {
  it('should ask the owner to write the first description', () => {
    // Arrange: an empty description is a thing to do, not merely a fact.
    givenWorkspace('');

    // Act
    renderTab();

    // Assert
    expect(screen.getByText(/Viết vài dòng để người mới biết nhóm học gì/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Thêm mô tả/ })).toBeTruthy();
  });

  it('should offer to change a description that already exists', () => {
    // Arrange
    givenWorkspace('Nhóm học MongoDB từ cơ bản tới nâng cao.');

    // Act
    renderTab();

    // Assert
    expect(screen.getByText('Nhóm học MongoDB từ cơ bản tới nâng cao.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Chỉnh sửa/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Thêm mô tả/ })).toBeNull();
  });

  it('should offer a non-owner no way to edit it', () => {
    // Arrange
    givenWorkspace('', false);

    // Act
    renderTab();

    // Assert
    expect(screen.queryByRole('link', { name: /Thêm mô tả/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Chỉnh sửa/ })).toBeNull();
  });
});

describe('GroupAboutTab facts', () => {
  it('should head the side card plainly', () => {
    // Arrange
    givenWorkspace('');

    // Act
    renderTab();

    // Assert
    expect(screen.getByText('Thông tin')).toBeTruthy();
    expect(screen.queryByText('Thông tin chi tiết')).toBeNull();
  });

  it('should count the members and files, with the way to each', () => {
    // Arrange
    givenWorkspace('');

    // Act
    renderTab();

    // Assert
    expect(screen.getByRole('link', { name: 'Xem' }).getAttribute('href'))
      .toBe(`/workspaces/${WORKSPACE_ID}/members`);
    expect(screen.getByRole('link', { name: 'Mở' }).getAttribute('href'))
      .toBe(`/workspaces/${WORKSPACE_ID}/documents`);
  });

  it('should drop the "RAG" badge, which named the technique rather than the offer', () => {
    // Arrange
    givenWorkspace('');

    // Act
    const { container } = renderTab();

    // Assert
    expect(container.textContent).not.toContain('RAG');
    expect(screen.getByText('Trợ lý AI của nhóm')).toBeTruthy();
  });

  it('should keep the way into the assistant', () => {
    // Arrange
    givenWorkspace('');

    // Act
    renderTab();

    // Assert
    expect(screen.getByRole('link', { name: /Bắt đầu hỏi Trợ lý AI/ }).getAttribute('href'))
      .toBe(`/workspaces/${WORKSPACE_ID}/chat`);
  });
});
