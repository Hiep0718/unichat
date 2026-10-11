import { workspaceApi } from '../../../src/features/workspaces/workspace-api';
import * as apiClient from '../../../src/lib/api-client';

jest.mock('../../../src/lib/api-client', () => ({
  fetchJson: jest.fn(),
}));

describe('workspaceApi', () => {
  const mockFetchJson = apiClient.fetchJson as jest.MockedFunction<typeof apiClient.fetchJson>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getWorkspaces with pagination params', async () => {
    const mockResponse = { content: [{ id: 'ws-1', name: 'AI Workspace' }], totalElements: 1 };
    mockFetchJson.mockResolvedValueOnce(mockResponse);

    const result = await workspaceApi.getWorkspaces({ page: 1, size: 10 });

    expect(mockFetchJson).toHaveBeenCalledWith('/workspaces?page=1&size=10');
    expect(result).toEqual(mockResponse);
  });

  it('calls getExploreWorkspaces with defaults', async () => {
    const mockResponse = { content: [], totalElements: 0 };
    mockFetchJson.mockResolvedValueOnce(mockResponse);

    const result = await workspaceApi.getExploreWorkspaces();

    expect(mockFetchJson).toHaveBeenCalledWith('/workspaces/explore?page=0&size=20');
    expect(result).toEqual(mockResponse);
  });

  it('calls getWorkspace by ID', async () => {
    const mockDetail = { id: 'ws-1', name: 'AI Class', documentCount: 5, memberCount: 10, visibility: 'PUBLIC' };
    mockFetchJson.mockResolvedValueOnce(mockDetail);

    const result = await workspaceApi.getWorkspace('ws-1');

    expect(mockFetchJson).toHaveBeenCalledWith('/workspaces/ws-1');
    expect(result).toEqual(mockDetail);
  });

  it('calls createWorkspace with payload', async () => {
    const payload = { name: 'Kinh tế lượng', visibility: 'PRIVATE' as const };
    const mockCreated = { id: 'ws-new', ...payload, documentCount: 0, memberCount: 1 };
    mockFetchJson.mockResolvedValueOnce(mockCreated);

    const result = await workspaceApi.createWorkspace(payload);

    expect(mockFetchJson).toHaveBeenCalledWith('/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(mockCreated);
  });

  it('calls joinWorkspace with POST method', async () => {
    mockFetchJson.mockResolvedValueOnce({ success: true });

    const result = await workspaceApi.joinWorkspace('ws-public');

    expect(mockFetchJson).toHaveBeenCalledWith('/workspaces/ws-public/join', {
      method: 'POST',
    });
    expect(result.success).toBe(true);
  });

  it('calls deleteWorkspace with DELETE method', async () => {
    mockFetchJson.mockResolvedValueOnce(undefined);

    await workspaceApi.deleteWorkspace('ws-1');

    expect(mockFetchJson).toHaveBeenCalledWith('/workspaces/ws-1', {
      method: 'DELETE',
    });
  });

  it('calls uploadDocument with FormData', async () => {
    const mockDoc = { id: 'doc-1', name: 'test.pdf', fileSizeBytes: 1024, status: 'PENDING' };
    mockFetchJson.mockResolvedValueOnce(mockDoc);

    const result = await workspaceApi.uploadDocument('ws-1', {
      uri: 'file:///path/to/test.pdf',
      name: 'test.pdf',
      type: 'application/pdf',
    });

    expect(mockFetchJson).toHaveBeenCalledWith(
      '/workspaces/ws-1/documents',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(Object),
      })
    );
    expect(result).toEqual(mockDoc);
  });
});
