import { renderHook, act } from '@testing-library/react-native';
import { useChatStream } from '../../../src/features/chat/use-chat-stream';
import * as sseClient from '../../../src/lib/sse-client';

jest.mock('../../../src/lib/sse-client', () => ({
  streamChatResponse: jest.fn(),
}));
jest.mock('../../../src/lib/idempotency', () => ({ generateIdempotencyKey: () => '00000000-0000-4000-8000-000000000004' }));

describe('useChatStream', () => {
  const mockStreamChatResponse = sseClient.streamChatResponse as jest.MockedFunction<
    typeof sseClient.streamChatResponse
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default empty state', () => {
    const { result } = renderHook(() =>
      useChatStream({ workspaceId: 'ws-1' })
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isThinking).toBe(false);
    expect(result.current.streamingAnswer).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('sends message and accumulates tokens until done', async () => {
    mockStreamChatResponse.mockImplementation(async (_wsId, _payload, callbacks) => {
      callbacks.onMetadata?.({ conversationId: 'conv-new', citations: [] });
      callbacks.onThought?.({
        stepIndex: 1,
        stepKey: 'SEARCH',
        title: 'Tìm kiếm',
        detail: 'Tìm tài liệu',
      });
      callbacks.onToken?.('Xin ');
      callbacks.onToken?.('chào!');
      callbacks.onFinal?.({ messageId: 'msg-final', conversationId: 'conv-new', operationId: 'operation-1',
        decision: 'ANSWER', answer: 'Câu trả lời đã kiểm tra', intent: 'FACTUAL', strategyVersion: 'v1.0', citations: [],
        refusalCode: null, requestId: 'request-1', knowledgeMode: 'STRICT', sections: [] });
      callbacks.onDone?.({ messageId: 'msg-final', conversationId: 'conv-new', operationId: 'operation-1' });
    });

    const onConvCreatedMock = jest.fn();
    const { result } = renderHook(() =>
      useChatStream({
        workspaceId: 'ws-1',
        onConversationCreated: onConvCreatedMock,
      })
    );

    await act(async () => {
      await result.current.sendMessage('Chào AI');
    });

    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[0].sender).toBe('USER');
    expect(result.current.messages[0].content).toBe('Chào AI');
    expect(result.current.messages[1].sender).toBe('ASSISTANT');
    expect(result.current.messages[1].content).toBe('Câu trả lời đã kiểm tra');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isThinking).toBe(false);
    expect(onConvCreatedMock).toHaveBeenCalledWith('conv-new');
  });

  it('resets chat state properly', () => {
    const { result } = renderHook(() =>
      useChatStream({ workspaceId: 'ws-1' })
    );

    act(() => {
      result.current.setMessages([
        {
          id: '1',
          conversationId: 'c1',
          sender: 'USER',
          content: 'Hello',
          createdAt: '',
        },
      ]);
    });

    expect(result.current.messages.length).toBe(1);

    act(() => {
      result.current.resetChat();
    });

    expect(result.current.messages.length).toBe(0);
  });
});
