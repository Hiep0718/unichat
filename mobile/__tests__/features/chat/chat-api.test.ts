import { chatApi } from '../../../src/features/chat/chat-api';
import { fetchJson } from '../../../src/lib/api-client';
import { askWorkspaceQuestion } from '../../../src/features/chat/chat-transport';

jest.mock('../../../src/lib/api-client', () => ({
  fetchJson: jest.fn(), ApiError: jest.requireActual('../../../src/lib/api-error').ApiError,
}));
jest.mock('../../../src/features/chat/chat-transport', () => ({ askWorkspaceQuestion: jest.fn() }));

const conversation = { id: 'conversation-1', workspaceId: 'workspace-1', title: 'Hội thoại', createdAt: '2026-10-11T00:00:00Z' };
const page = { content: [conversation], number: 1, size: 20, totalElements: 21, totalPages: 2 };

describe('chatApi', () => {
  const request = jest.mocked(fetchJson);
  beforeEach(() => jest.clearAllMocks());
  it('should map the actual paginated conversation response', async () => {
    request.mockResolvedValueOnce(page);
    const result = await chatApi.getConversations('workspace-1', { page: 1, size: 20 });
    expect(request).toHaveBeenCalledWith('/workspaces/workspace-1/conversations?page=1&size=20');
    expect(result.totalPages).toBe(2);
    expect(result.items[0].id).toBe(conversation.id);
  });
  it('should reject unsupported cursors and oversized pages before HTTP', async () => {
    await expect(chatApi.getConversations('workspace-1', { cursor: 'old' })).rejects.toThrow('Cursor không được hỗ trợ');
    await expect(chatApi.getConversations('workspace-1', { size: 101 })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it('should read bounded detail and redact unavailable source content', async () => {
    request.mockResolvedValueOnce({ ...conversation, messages: [{ id: 'assistant-1', role: 'ASSISTANT', content: 'secret', redacted: true, citations: [{ excerpt: 'secret' }] }] });
    const result = await chatApi.getConversation('workspace-1', conversation.id);
    expect(result.conversation.id).toBe(conversation.id);
    expect(result.messages[0].sender).toBe('ASSISTANT');
    expect(result.messages[0].content).not.toContain('secret');
    expect(result.messages[0].citations).toEqual([]);
  });
  it('should preserve snapshotSequence while reading older message pages', async () => {
    request.mockResolvedValueOnce({ ...page, content: [], snapshotSequence: 42 });
    await chatApi.getMessages('workspace-1', conversation.id, 1, 20, 42);
    expect(request).toHaveBeenCalledWith('/workspaces/workspace-1/conversations/conversation-1/messages?page=1&size=20&snapshotSequence=42');
  });
  it('should create metadata and delete through owner-only routes', async () => {
    request.mockResolvedValueOnce(conversation).mockResolvedValueOnce(undefined);
    await chatApi.createConversation('workspace-1');
    await chatApi.deleteConversation('workspace-1', conversation.id);
    expect(request).toHaveBeenCalledWith('/workspaces/workspace-1/conversations', { method: 'POST' });
    expect(request).toHaveBeenCalledWith('/workspaces/workspace-1/conversations/conversation-1', { method: 'DELETE' });
  });
  it('should pass the same retry identity to the shared transport', async () => {
    const options = { idempotencyKey: '00000000-0000-4000-8000-000000000004' };
    const payload = { question: 'Câu hỏi kiểm thử', allowExternalKnowledge: false };
    await chatApi.askQuestion('workspace-1', payload, options);
    expect(askWorkspaceQuestion).toHaveBeenCalledWith('workspace-1', payload, options);
  });
});
