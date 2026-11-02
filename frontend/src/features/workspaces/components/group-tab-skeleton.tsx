/**
 * What stands in while a tab's chunk arrives.
 *
 * Shaped like the panels that are coming rather than a spinner: a tab swap
 * that blanks to a centred spinner reads as the page reloading, which is what
 * it used to do. Blocks the size of the real cards hold the scroll position
 * and the eye in place, so the arriving content replaces them rather than
 * pushing everything down.
 */
import './group-tab-skeleton.css';

export function GroupTabSkeleton() {
  return (
    <div className="group-skeleton" role="status" aria-label="Đang tải">
      <div className="group-skeleton__bar" />
      <div className="group-skeleton__card" />
      <div className="group-skeleton__card group-skeleton__card--short" />
    </div>
  );
}
