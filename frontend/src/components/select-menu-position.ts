/**
 * Where a SelectMenu's portalled list sits, and when it goes away.
 *
 * The list is `position: fixed`, so it does not move with the page by itself.
 * It follows its trigger on scroll and resize instead of closing: a page that
 * is still settling from a scroll — momentum on a trackpad, or a test driver
 * scrolling the trigger into view just before clicking it — delivers its
 * scroll event after the click, and closing on it shut the list the moment
 * it opened.
 */
import { useEffect } from 'react';

/** Fixed-position box for the list, measured from the trigger. */
export interface Anchor {
  /** Set when the list opens downward; `bottom` when it flips above. */
  readonly top?: number;
  readonly bottom?: number;
  readonly left: number;
  readonly right: number;
  readonly width: number;
}

/** Matches the list's CSS max-height, so the flip decision fits what is drawn. */
const LIST_MAX_HEIGHT = 320;
const GAP = 6;

/**
 * Opens downward unless the trigger is near the bottom of the viewport and
 * there is more room above it, as a native select does.
 */
export function anchorFor(rect: DOMRect): Anchor {
  const below = window.innerHeight - rect.bottom;
  const flip = below < LIST_MAX_HEIGHT + GAP && rect.top > below;
  const vertical = flip ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP };
  return { ...vertical, left: rect.left, right: window.innerWidth - rect.right, width: rect.width };
}

/**
 * Lines the list up under (or over) its trigger, never narrower than it.
 */
export function placement(anchor: Anchor, align: 'start' | 'end'): React.CSSProperties {
  const side = align === 'end' ? { right: anchor.right } : { left: anchor.left };
  const vertical = anchor.bottom === undefined ? { top: anchor.top } : { bottom: anchor.bottom };
  return { minWidth: anchor.width, ...vertical, ...side };
}

/** True once the trigger has left the viewport entirely. */
function offscreen(rect: DOMRect): boolean {
  return rect.bottom < 0 || rect.top > window.innerHeight;
}

/**
 * While open: closes on a press outside the trigger and list, and keeps the
 * list attached to its trigger as the page scrolls or resizes — closing only
 * once the trigger has scrolled out of sight. Updates are coalesced to one per
 * animation frame.
 */
export function useFollowAndDismiss(
  open: boolean,
  triggerRef: React.RefObject<HTMLButtonElement | null>,
  listRef: React.RefObject<HTMLUListElement | null>,
  close: (refocus: boolean) => void,
  setAnchor: (anchor: Anchor) => void,
) {
  useEffect(() => {
    if (!open) return undefined;
    let frame = 0;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (listRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    const follow = () => {
      frame = 0;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect || offscreen(rect)) close(false);
      else setAnchor(anchorFor(rect));
    };
    const onMove = (event: Event) => {
      // A scroll inside the list itself is the user browsing a long list.
      if (event.target instanceof Node && listRef.current?.contains(event.target)) return;
      if (frame === 0) frame = window.requestAnimationFrame(follow);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, triggerRef, listRef, close, setAnchor]);
}
