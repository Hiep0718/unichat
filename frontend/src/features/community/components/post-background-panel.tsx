/**
 * A short post shown on its chosen colour.
 *
 * The text is set large and centred rather than run as a paragraph, which is
 * the whole point of the feature: a two-line thought reads as a statement
 * instead of disappearing into a list of grey cards.
 *
 * Renders nothing when the post has no background, so callers can place it
 * unconditionally.
 */
import { backgroundFor } from '../post-background';
import './post-background-panel.css';

interface PostBackgroundPanelProps {
  readonly backgroundKey: string | null | undefined;
  readonly body: string;
  /** Smaller type and height for a feed card, full size on a post page. */
  readonly compact?: boolean;
}

export function PostBackgroundPanel({
  backgroundKey,
  body,
  compact = false,
}: PostBackgroundPanelProps) {
  const preset = backgroundFor(backgroundKey);
  if (!preset || !body.trim()) {
    return null;
  }

  return (
    <div
      className={`post-bg ${compact ? 'post-bg--compact' : ''}`}
      style={{ background: preset.background }}
    >
      {/* Long words in a centred block would otherwise overflow the panel. */}
      <p className="post-bg__text">{body}</p>
    </div>
  );
}
