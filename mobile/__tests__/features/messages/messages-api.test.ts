import { MAX_MESSAGE_LENGTH, MESSAGE_PAGE_SIZE, messagesApi } from '../../../src/features/messages/messages-api';
import { fetchJson } from '../../../src/lib/api-client';

jest.mock('../../../src/lib/api-client', () => ({ fetchJson: jest.fn() }));

const CONVERSATION = '123e4567-e89b-12d3-a456-426614174000';
const USER = '223e4567-e89b-12d3-a456-426614174000';

describe('messagesApi', () => {
  const request = jest.mocked(fetchJson);

  beforeEach(() => {
    jest.clearAllMocks();
    request.mockResolvedValue(undefined);
  });

  it('reads contacts and conversations from the Work Chat endpoints', async () => {
    await messagesApi.fetchContacts();
    await messagesApi.fetchConversations();

    expect(request).toHaveBeenNthCalledWith(1, '/work-chat/contacts');
    expect(request).toHaveBeenNthCalledWith(2, '/work-chat/conversations');
  });

  it('opens a conversation with a person by posting their id', async () => {
    await messagesApi.openConversation(USER);

    expect(request).toHaveBeenCalledWith(`/work-chat/conversations/with/${USER}`, { method: 'POST' });
  });

  it('pages messages with a bounded size', async () => {
    await messagesApi.fetchMessages(CONVERSATION, 2);

    expect(request).toHaveBeenCalledWith(
      `/work-chat/conversations/${CONVERSATION}/messages?page=2&size=${MESSAGE_PAGE_SIZE}`,
    );
  });

  it('sends a trimmed body as JSON', async () => {
    await messagesApi.sendMessage(CONVERSATION, '  xin chào  ');

    expect(request).toHaveBeenCalledWith(`/work-chat/conversations/${CONVERSATION}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: 'xin chào' }),
    });
  });

  it('rejects invalid input before any request leaves the device', async () => {
    expect(() => messagesApi.sendMessage(CONVERSATION, '   ')).toThrow('không được để trống');
    expect(() => messagesApi.sendMessage(CONVERSATION, 'a'.repeat(MAX_MESSAGE_LENGTH + 1))).toThrow('tối đa');
    expect(() => messagesApi.fetchMessages('../admin', 0)).toThrow('không hợp lệ');
    expect(() => messagesApi.fetchMessages(CONVERSATION, -1)).toThrow();
    expect(() => messagesApi.openConversation('not-a-user')).toThrow('không hợp lệ');
    expect(request).not.toHaveBeenCalled();
  });

  it('marks a conversation read', async () => {
    await messagesApi.markRead(CONVERSATION);

    expect(request).toHaveBeenCalledWith(`/work-chat/conversations/${CONVERSATION}/read`, { method: 'POST' });
  });

  it('unwraps the call history page and tolerates a missing content field', async () => {
    const entry = { id: 'call-1' };
    request.mockResolvedValueOnce({ content: [entry] }).mockResolvedValueOnce({});

    await expect(messagesApi.fetchCallHistory(CONVERSATION)).resolves.toEqual([entry]);
    await expect(messagesApi.fetchCallHistory(CONVERSATION)).resolves.toEqual([]);
    expect(request).toHaveBeenCalledWith(`/conversations/${CONVERSATION}/calls?page=0&size=50`);
  });
});
