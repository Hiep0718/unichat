/**
 * Animated skeleton placeholder for workspace cards during loading.
 */
import './skeleton-card.css';

/**
 * Renders a shimmering placeholder card mimicking workspace card layout.
 */
export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__header">
        <div className="skeleton-bone skeleton-bone--badge" />
      </div>
      <div className="skeleton-card__body">
        <div className="skeleton-bone skeleton-bone--title" />
        <div className="skeleton-bone skeleton-bone--desc" />
        <div className="skeleton-bone skeleton-bone--desc-short" />
      </div>
      <div className="skeleton-card__footer">
        <div className="skeleton-bone skeleton-bone--stat" />
        <div className="skeleton-bone skeleton-bone--stat" />
      </div>
    </div>
  );
}
