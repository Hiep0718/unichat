import { workspaceApi } from '../../../src/features/workspaces/workspace-api';
import { fetchJson } from '../../../src/lib/api-client';

jest.mock('../../../src/lib/api-client', () => ({ fetchJson: jest.fn() }));

const mockedFetch = fetchJson as jest.MockedFunction<typeof fetchJson>;

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';

/** The path the call was made with, so the query string can be asserted. */
function lastPath(): string {
  const calls = mockedFetch.mock.calls;
  return String(calls[calls.length - 1]?.[0]);
}

beforeEach(() => jest.clearAllMocks());

describe('getWorkspaceMembers', () => {
  it('should ask the group members endpoint', async () => {
    // Arrange
    mockedFetch.mockResolvedValueOnce([]);

    // Act
    await workspaceApi.getWorkspaceMembers(WORKSPACE_ID);

    // Assert
    expect(lastPath()).toBe(`/workspaces/${WORKSPACE_ID}/members`);
  });
});

describe('getWorkspacePosts', () => {
  it('should ask for the newest posts of the group by default', async () => {
    // Arrange
    mockedFetch.mockResolvedValueOnce({ content: [], totalElements: 0 });

    // Act
    await workspaceApi.getWorkspacePosts(WORKSPACE_ID);

    // Assert
    const path = lastPath();
    expect(path).toContain(`/workspaces/${WORKSPACE_ID}/discussions`);
    expect(path).toContain('sort=NEW');
    expect(path).toContain('page=0');
    expect(path).toContain('size=20');
  });

  it('should narrow to one kind of post when asked', async () => {
    // Arrange
    mockedFetch.mockResolvedValueOnce({ content: [], totalElements: 0 });

    // Act
    await workspaceApi.getWorkspacePosts(WORKSPACE_ID, { label: 'QUESTION' });

    // Assert
    expect(lastPath()).toContain('label=QUESTION');
  });

  it('should leave the label out entirely rather than send an empty one', async () => {
    // Arrange: `label=` rỗng là một bộ lọc, không phải sự vắng mặt của bộ lọc.
    mockedFetch.mockResolvedValueOnce({ content: [], totalElements: 0 });

    // Act
    await workspaceApi.getWorkspacePosts(WORKSPACE_ID, { label: undefined });

    // Assert
    expect(lastPath()).not.toContain('label=');
  });

  it('should present a group post the way the shared card expects it', async () => {
    // Arrange: the two endpoints carry the same post under slightly different
    // names, so the group list is mapped rather than the card duplicated.
    mockedFetch.mockResolvedValueOnce({
      content: [{
        id: 'p1',
        workspaceId: WORKSPACE_ID,
        workspaceName: null,
        authorId: 'u1',
        authorName: 'hungdz1372004',
        title: 'Cho tôi đề mẫu',
        body: 'Nội dung',
        label: 'QUESTION',
        pinned: true,
        hasAiAnswer: true,
        replyCount: 1,
        createdAt: '2026-09-07T00:00:00Z',
      }],
      totalElements: 1,
    });

    // Act
    const page = await workspaceApi.getWorkspacePosts(WORKSPACE_ID);

    // Assert
    const post = page.content[0]!;
    expect(post.pinned).toBe(true);
    expect(post.hasAiAnswer).toBe(true);
    // Bookmarks are a feed concept; the group list neither shows nor sets them.
    expect(post.isBookmarked).toBe(false);
    // A null workspace name must not reach the card as the string "null".
    expect(post.workspaceName).toBe('');
    expect(post.attachments).toEqual([]);
  });

  it('should read a post with no assistant reply as unanswered', async () => {
    // Arrange
    mockedFetch.mockResolvedValueOnce({
      content: [{ id: 'p2', workspaceId: WORKSPACE_ID, authorId: 'u1', authorName: 'A',
        title: 'T', body: 'B', createdAt: '2026-09-07T00:00:00Z' }],
      totalElements: 1,
    });

    // Act
    const page = await workspaceApi.getWorkspacePosts(WORKSPACE_ID);

    // Assert
    expect(page.content[0]!.hasAiAnswer).toBe(false);
    expect(page.content[0]!.pinned).toBe(false);
  });

  it('should treat a response with no content array as an empty page', async () => {
    // Arrange
    mockedFetch.mockResolvedValueOnce({ totalElements: 0 } as never);

    // Act
    const page = await workspaceApi.getWorkspacePosts(WORKSPACE_ID);

    // Assert: không phải lỗi, chỉ là nhóm chưa có bài nào.
    expect(page.content).toEqual([]);
  });
});
