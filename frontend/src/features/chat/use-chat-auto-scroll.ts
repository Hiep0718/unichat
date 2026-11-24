import { useCallback, useLayoutEffect, useRef } from 'react';
import type { RefObject, WheelEvent } from 'react';
import type { MessageItem } from './components/chat-message-item';

const BOTTOM_THRESHOLD_PX = 96;
const SCROLL_THROTTLE_MS = 100;

/** Returns true when a scrollable message container is already resting near its bottom edge. */
export function isNearBottom(element: Pick<HTMLElement, 'scrollHeight' | 'scrollTop' | 'clientHeight'>): boolean {
  const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
  return distance <= BOTTOM_THRESHOLD_PX;
}

interface UseChatAutoScrollOptions {
  readonly messages: readonly MessageItem[];
  readonly activeError: string | null;
  readonly initialLoading: boolean;
}

/**
 * Sticky bottom scrolling for the chat message list:
 * - Scrolls inside the message container (preserving bottom composer padding clearance).
 * - Immediately yields control when the user scrolls up while AI is thinking/streaming.
 * - Preserves visual anchor when older history messages are prepended.
 */
export function useChatAutoScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  { messages, activeError, initialLoading }: UseChatAutoScrollOptions,
) {
  const pinnedRef = useRef(true);
  const prevFirstIdRef = useRef<string | undefined>(undefined);
  const prevLastIdRef = useRef<string | undefined>(undefined);
  const prevScrollHeightRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const lastThrottleAtRef = useRef(0);

  const pinToBottom = useCallback(() => {
    pinnedRef.current = true;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    lastScrollTopRef.current = el.scrollTop;
    prevScrollHeightRef.current = el.scrollHeight;
  }, [containerRef]);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (event.deltaY < 0) pinnedRef.current = false;
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    prevScrollHeightRef.current = el.scrollHeight;
    const nearBottom = isNearBottom(el);
    if (!nearBottom && el.scrollTop < lastScrollTopRef.current - 4) {
      pinnedRef.current = false;
      lastScrollTopRef.current = el.scrollTop;
      return;
    }
    const now = Date.now();
    if (now - lastThrottleAtRef.current < SCROLL_THROTTLE_MS && !nearBottom) return;
    lastThrottleAtRef.current = now;
    pinnedRef.current = nearBottom;
    lastScrollTopRef.current = el.scrollTop;
  }, [containerRef]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || initialLoading) return;
    const firstId = messages[0]?.id;
    const lastId = messages[messages.length - 1]?.id;
    const prependedOlder = Boolean(
      prevFirstIdRef.current && firstId !== prevFirstIdRef.current && lastId === prevLastIdRef.current,
    );
    if (prependedOlder) {
      const delta = el.scrollHeight - prevScrollHeightRef.current;
      if (delta > 0) el.scrollTop += delta;
    } else if (pinnedRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    lastScrollTopRef.current = el.scrollTop;
    prevFirstIdRef.current = firstId;
    prevLastIdRef.current = lastId;
    prevScrollHeightRef.current = el.scrollHeight;
  }, [containerRef, messages, activeError, initialLoading]);

  return { pinToBottom, handleScroll, handleWheel };
}
