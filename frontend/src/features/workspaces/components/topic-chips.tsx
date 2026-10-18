/**
 * The topics a workspace is filed under, as chips on its card.
 *
 * Read-only. The picker that sets them is {@link TopicPicker}.
 */
import { Icon } from '../../../components/icon';
import { topicLookup, useWorkspaceTopics } from '../workspace-topics';

import './topic-chips.css';

interface TopicChipsProps {
  readonly topics: readonly string[];
  /** Smaller variant for a dense card. */
  readonly compact?: boolean;
}

export function TopicChips({ topics, compact = false }: TopicChipsProps) {
  const { data } = useWorkspaceTopics();
  const lookup = topicLookup(data);

  // A name this build does not know is dropped rather than shown raw: a card
  // reading "NETWORK_SYSTEMS" is worse than a card with one chip fewer.
  const known = topics.map((name) => lookup.get(name)).filter((option) => option !== undefined);

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
