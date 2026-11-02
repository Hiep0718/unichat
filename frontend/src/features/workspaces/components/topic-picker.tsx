/**
 * Choosing what a knowledge space is about.
 *
 * Twenty chips in one wrap is a wall: nothing for the eye to rest on, and
 * finding "Tâm lý" means reading all twenty. They are banded instead, so the
 * choice becomes picking a band and then one of five or six.
 *
 * Toggle chips rather than a multi-select list, because at most three may be
 * picked and a row of chips shows the current answer at a glance.
 */
import { useMemo } from 'react';

import { Icon } from '../../../components/icon';
import { MAX_TOPICS_PER_WORKSPACE, useWorkspaceTopics } from '../workspace-topics';

import type { WorkspaceTopicOption } from '../workspace-topics';

import './topic-picker.css';

interface TopicPickerProps {
  readonly value: readonly string[];
  readonly onChange: (topics: readonly string[]) => void;
  readonly disabled?: boolean;
}

interface TopicBand {
  readonly group: string;
  readonly groupLabel: string;
  readonly topics: readonly WorkspaceTopicOption[];
}

/** Groups the vocabulary, keeping the order the server sent it in. */
function toBands(options: readonly WorkspaceTopicOption[]): readonly TopicBand[] {
  const bands: TopicBand[] = [];
  for (const option of options) {
    const last = bands[bands.length - 1];
    if (last && last.group === option.group) {
      (last.topics as WorkspaceTopicOption[]).push(option);
      continue;
    }
    bands.push({ group: option.group, groupLabel: option.groupLabel, topics: [option] });
  }
  return bands;
}

export function TopicPicker({ value, onChange, disabled = false }: TopicPickerProps) {
  const { data, isLoading, error } = useWorkspaceTopics();
  const bands = useMemo(() => toBands(data ?? []), [data]);

  const atLimit = value.length >= MAX_TOPICS_PER_WORKSPACE;

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((picked) => picked !== name));
      return;
    }
    if (atLimit) return;
    onChange([...value, name]);
  };

  if (isLoading) {
    return <p className="topic-picker__state">Đang tải chủ đề…</p>;
  }

  if (error || !data) {
    // Topics are optional, so failing to load them must not block the form.
    return <p className="topic-picker__state">Không tải được danh sách chủ đề.</p>;
  }

  return (
    <div className="topic-picker">
      <div className="topic-picker__head">
        <p className="topic-picker__hint">
          Chọn tối đa {MAX_TOPICS_PER_WORKSPACE} chủ đề để nhóm xuất hiện đúng chỗ ở trang
          Khám phá. Có thể bỏ trống.
        </p>
        <span
          className={`topic-picker__count ${atLimit ? 'topic-picker__count--full' : ''}`}
          aria-live="polite"
        >
          {value.length}/{MAX_TOPICS_PER_WORKSPACE}
        </span>
      </div>

      {bands.map((band) => (
        <section key={band.group} className="topic-picker__band">
          <h4 className="topic-picker__band-title">{band.groupLabel}</h4>
          <div className="topic-picker__options" role="group" aria-label={band.groupLabel}>
            {band.topics.map((topic) => {
              const picked = value.includes(topic.name);
              return (
                <button
                  key={topic.name}
                  type="button"
                  className={`topic-picker__option ${picked ? 'topic-picker__option--picked' : ''}`}
                  aria-pressed={picked}
                  // Unpicked options go flat once three are chosen, rather than
                  // vanishing: the reader still sees what else exists.
                  disabled={disabled || (!picked && atLimit)}
                  onClick={() => toggle(topic.name)}
                >
                  <Icon name={picked ? 'check' : topic.icon} size={15} />
                  {topic.label}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
