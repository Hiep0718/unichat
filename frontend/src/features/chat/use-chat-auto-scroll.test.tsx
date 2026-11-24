import { useRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { isNearBottom, useChatAutoScroll } from './use-chat-auto-scroll';
import type { MessageItem } from './components/chat-message-item';

afterEach(cleanup);

function ScrollHarness({
  messages,
  activeError = null,
  initialLoading = false,
}: {
  messages: MessageItem[];
  activeError?: string | null;
  initialLoading?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { pinToBottom, handleScroll, handleWheel } = useChatAutoScroll(containerRef, {
    messages,
    activeError,
    initialLoading,
  });
  return (
    <div>
      <button type="button" onClick={pinToBottom}>Pin</button>
      <div
        ref={containerRef}
        data-testid="scroll-body"
        onScroll={handleScroll}
        onWheel={handleWheel}
      >
        {messages.map((item) => <p key={item.id}>{item.content}</p>)}
      </div>
    </div>
  );
}

function setMetrics(element: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number) {
  Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true });
  element.scrollTop = scrollTop;
}

describe('useChatAutoScroll', () => {
  it('should detect proximity to bottom within threshold', () => {
    expect(isNearBottom({ scrollHeight: 1000, clientHeight: 500, scrollTop: 450 })).toBe(true);
    expect(isNearBottom({ scrollHeight: 1000, clientHeight: 500, scrollTop: 300 })).toBe(false);
  });

  it('should stop auto-scrolling when user scrolls up during AI thinking or streaming', () => {
    const initial: MessageItem[] = [
      { id: 'u-1', role: 'USER', content: 'So sánh SQL và NoSQL' },
      { id: 'a-1', role: 'ASSISTANT', content: '', isStreaming: true },
    ];
    const { rerender } = render(<ScrollHarness messages={initial} />);
    const container = screen.getByTestId('scroll-body');
    setMetrics(container, 1200, 500, 700);
    fireEvent.scroll(container);

    // User wheels up to read earlier messages while AI is thinking
    fireEvent.wheel(container, { deltaY: -120 });
    container.scrollTop = 200;
    fireEvent.scroll(container);

    // AI emits thought / token updates that grow the thread
    setMetrics(container, 1450, 500, 200);
    rerender(
      <ScrollHarness
        messages={[
          initial[0]!,
          {
            id: 'a-1',
            role: 'ASSISTANT',
            content: 'Đang trả lời...',
            isStreaming: true,
            thoughts: [{ stepIndex: 1, stepKey: 'retrieve', title: 'Đang tìm tài liệu', detail: '' }],
          },
        ]}
      />,
    );

    expect(container.scrollTop).toBe(200);

    // Explicitly re-pinning (e.g. submitting a new prompt) scrolls to the full bottom
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(container.scrollTop).toBe(1450);
  });

  it('should preserve reading anchor when older messages are prepended', () => {
    const initial: MessageItem[] = [
      { id: 'u-2', role: 'USER', content: 'Câu hỏi mới' },
      { id: 'a-2', role: 'ASSISTANT', content: 'Câu trả lời mới' },
    ];
    const { rerender } = render(<ScrollHarness messages={initial} />);
    const container = screen.getByTestId('scroll-body');
    setMetrics(container, 1000, 500, 40);
    fireEvent.scroll(container);

    // Prepend older messages (height grows by +400px while last message id stays 'a-2')
    setMetrics(container, 1400, 500, 40);
    rerender(
      <ScrollHarness
        messages={[
          { id: 'u-1', role: 'USER', content: 'Câu hỏi cũ' },
          ...initial,
        ]}
      />,
    );

    expect(container.scrollTop).toBe(440);
  });
});
