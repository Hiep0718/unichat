/**
 * The chrome above a group's post list: search, compose, filter, order.
 *
 * Split out of the page because these four controls are the tab's whole
 * chrome, and leaving them inline made the page's own render longer than the
 * list it exists to draw.
 */
import { Icon } from '../../../components/icon';

import './discussion-controls.css';

const LABELS = ['ALL', 'QUESTION', 'DISCUSSION', 'ANNOUNCEMENT'] as const;

/**
 * The two orderings, in the order they are offered.
 *
 * "Nổi bật" is the server's HOT sort. It is named for what the reader gets —
 * the posts the group engaged with — rather than for the parameter.
 */
const SORTS: readonly { value: 'NEW' | 'HOT'; label: string }[] = [
  { value: 'NEW', label: 'Mới' },
  { value: 'HOT', label: 'Nổi bật' },
];

/** The Vietnamese name of a filter, for the chip that selects it. */
function labelName(l: string): string {
  switch (l) {
    case 'ALL': return 'Tất cả';
    case 'QUESTION': return 'Câu hỏi';
    case 'DISCUSSION': return 'Thảo luận';
    case 'ANNOUNCEMENT': return 'Thông báo';
    default: return l;
  }
}

interface DiscussionControlsProps {
  readonly searchInput: string;
  readonly onSearch: (value: string) => void;
  readonly activeLabel: string;
  readonly onLabel: (label: string) => void;
  readonly activeSort: 'HOT' | 'NEW';
  readonly onSort: (sort: 'HOT' | 'NEW') => void;
  readonly onCompose: () => void;
}

export function DiscussionControls({
  searchInput,
  onSearch,
  activeLabel,
  onLabel,
  activeSort,
  onSort,
  onCompose,
}: DiscussionControlsProps) {
  return (
    <>
      {/* Finding a post and writing one are the two things someone arrives at
          this tab to do, so they share the top row rather than stacking the
          search box above a strip of filters. */}
      <div className="disc-list__top">
        <div className="disc-list__search">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Tìm trong nhóm này..."
            aria-label="Tìm bài viết trong nhóm"
          />
        </div>
        <button type="button" className="disc-list__new-btn" onClick={onCompose}>
          <Icon name="edit" size={17} />
          Tạo bài viết
        </button>
      </div>

      <div className="disc-list__header">
        <div className="disc-list__filters" role="group" aria-label="Lọc theo loại bài">
          {LABELS.map((l) => (
            <button
              key={l}
              type="button"
              className={`disc-list__chip ${activeLabel === l ? 'disc-list__chip--active' : ''}`}
              onClick={() => onLabel(l)}
              aria-pressed={activeLabel === l}
            >
              {labelName(l)}
            </button>
          ))}
        </div>

        {/* Two ways to order one list, so they read as one control with two
            positions rather than two buttons that happen to sit together. */}
        <div className="disc-list__sort" role="group" aria-label="Sắp xếp bài viết">
          {SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`disc-list__sort-btn ${activeSort === s.value ? 'disc-list__sort-btn--active' : ''}`}
              onClick={() => onSort(s.value)}
              aria-pressed={activeSort === s.value}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
