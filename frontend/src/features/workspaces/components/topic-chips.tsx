/**
 * The topics a workspace is filed under, as chips on its card.
 *
 * Read-only. The picker that sets them is {@link TopicPicker}.
 */
import { Icon } from '../../../components/icon';
import { useWorkspaceTopics, visibleTopics } from '../workspace-topics';

import './topic-chips.css';

interface TopicChipsProps {
  readonly topics: readonly string[];
  /** Smaller variant for a dense card. */
  readonly compact?: boolean;
  /** Most chips to draw; the rest are left to the group's own page. */
  readonly max?: number;
}

/**
 * Renders a workspace's known topics as labelled chips, or nothing at all.
 */
export function TopicChips({ topics, compact = false, max }: TopicChipsProps) {
  const { data } = useWorkspaceTopics();
  const known = visibleTopics(data, topics, max);

  if (known.length === 0) {
    return null;
  }

  return (
    <ul className={`topic-chips ${compact ? 'topic-chips--compact' : ''}`}>
      {known.map((topic) => (
        <li key={topic.name} className="topic-chips__chip">
          <Icon name={topic.icon} size={compact ? 13 : 14} />
          {topic.label}
        </li>
      ))}
    </ul>
  );
}
