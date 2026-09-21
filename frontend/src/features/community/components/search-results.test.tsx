import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchResults } from './search-results';
import * as api from '../community-api';
import type { DocumentHit, PostHit } from '../community-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const post = (overrides: Partial<PostHit> = {}): PostHit => ({
  id: 'p1',
  workspaceId: 'w1',
  workspaceName: 'Cơ sở dữ liệu',
  title: 'Chỉ mục chạy chậm',
  snippet: 'Truy vấn của mình mất 3 giây...',
  replyCount: 2,
  resolved: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const document = (overrides: Partial<DocumentHit> = {}): DocumentHit => ({
  id: 'd1',
  workspaceId: 'w1',
  workspaceName: 'Cơ sở dữ liệu',
  originalName: 'giao-trinh-csdl.pdf',
  mediaType: 'application/pdf',
  byteSize: 2048,
  readableByAi: true,
  createdAt: new Date().toISOString(),
  ...overrides,
});

function mockSearch(posts: PostHit[], documents: DocumentHit[]) {
  return vi.spyOn(api, 'fetchSearchResults').mockResolvedValue({ posts, documents });
}

describe('SearchResults', () => {
  it('should show posts and documents from the same query', async () => {
    // Arrange and Act
    mockSearch([post()], [document()]);
    render(
      <SearchResults query="chỉ mục" onOpenPost={() => {}} onOpenDocuments={() => {}} />,
    );

    // Assert
    expect(await screen.findByText('Chỉ mục chạy chậm')).toBeInTheDocument();
    expect(screen.getByText('giao-trinh-csdl.pdf')).toBeInTheDocument();
  });

  it('should name the group so a result says where it lives', async () => {
    // Arrange and Act
    mockSearch([post()], []);
    render(
      <SearchResults query="chỉ mục" onOpenPost={() => {}} onOpenDocuments={() => {}} />,
    );

    // Assert
    expect(await screen.findByText(/Cơ sở dữ liệu/)).toBeInTheDocument();
  });

  it('should open the post in the group it belongs to', async () => {
    // Arrange
    const onOpenPost = vi.fn();
    mockSearch([post()], []);
    render(
      <SearchResults query="chỉ mục" onOpenPost={onOpenPost} onOpenDocuments={() => {}} />,
    );

    // Act
    await userEvent.click(await screen.findByText('Chỉ mục chạy chậm'));

    // Assert
    expect(onOpenPost).toHaveBeenCalledWith('w1', 'p1');
  });

  it('should take a document result to its group library', async () => {
    // Arrange
    const onOpenDocuments = vi.fn();
    mockSearch([], [document()]);
    render(
      <SearchResults query="csdl" onOpenPost={() => {}} onOpenDocuments={onOpenDocuments} />,
    );

    // Act
    await userEvent.click(await screen.findByText('giao-trinh-csdl.pdf'));

    // Assert
    expect(onOpenDocuments).toHaveBeenCalledWith('w1');
  });

  it('should say which documents the assistant can actually read', async () => {
    // Arrange and Act
    mockSearch([], [document({ readableByAi: false })]);
    render(
      <SearchResults query="csdl" onOpenPost={() => {}} onOpenDocuments={() => {}} />,
    );

    // Assert
    expect(await screen.findByText(/Chưa được duyệt/)).toBeInTheDocument();
  });

  it('should mark a post that already has an accepted answer', async () => {
    // Arrange and Act
    mockSearch([post({ resolved: true })], []);
    render(
      <SearchResults query="chỉ mục" onOpenPost={() => {}} onOpenDocuments={() => {}} />,
    );

    // Assert
    expect(await screen.findByText('Đã có lời giải')).toBeInTheDocument();
  });

  it('should say plainly when nothing matched', async () => {
    // Arrange and Act
    mockSearch([], []);
    render(
      <SearchResults query="abcxyz" onOpenPost={() => {}} onOpenDocuments={() => {}} />,
    );

    // Assert
    expect(await screen.findByText(/Không tìm thấy kết quả/)).toBeInTheDocument();
  });

  it('should report a failed search instead of pretending there were no results', async () => {
    // Arrange: an empty state here would be a lie about the library.
    vi.spyOn(api, 'fetchSearchResults').mockRejectedValue(new Error('offline'));

    // Act
    render(
      <SearchResults query="chỉ mục" onOpenPost={() => {}} onOpenDocuments={() => {}} />,
    );

    // Assert
    expect(await screen.findByText(/Không tìm kiếm được/)).toBeInTheDocument();
  });
});
