/**
 * "Seen by" summary for a post.
 *
 * Everyone sees how many members opened it. Owners and editors can expand the
 * list, because the useful question for an announcement is not who read it but
 * who has not — replies never answer that, since the people who most need to
 * read an announcement are the ones who never comment.
 */
import { useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';
import { fetchPostReaders } from '../community-api';
import type { PostReadSummary } from '../community-api';
import './post-readers.css';

interface PostReadersProps {
  readonly workspaceId: string;
  readonly discussionId: string;
  /** Bump to reload after the current user's own read is recorded. */
  readonly reloadToken?: number;
}

export function PostReaders({ workspaceId, discussionId, reloadToken = 0 }: PostReadersProps) {
  const [summary, setSummary] = useState<PostReadSummary | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPostReaders(workspaceId, discussionId)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        // The summary is supplementary; the post still reads fine without it.
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, discussionId, reloadToken]);

  if (!summary) return null;

  const canSeeNames = summary.readers.length > 0 || summary.notYetRead.length > 0;

  return (
    <div className="post-readers">
      <button
        type="button"
        className="post-readers__summary"
        onClick={() => canSeeNames && setExpanded((open) => !open)}
        disabled={!canSeeNames}
        aria-expanded={expanded}
      >
        <Icon name="visibility" size={16} />
        <span>
          <strong>{summary.readCount}</strong>/{summary.memberCount} thành viên đã xem
        </span>
        {canSeeNames && (
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={17} />
        )}
      </button>

      {expanded && (
        <div className="post-readers__detail">
          {summary.notYetRead.length > 0 && (
            <section>
              <h4 className="post-readers__heading post-readers__heading--pending">
                Chưa xem ({summary.notYetRead.length})
              </h4>
              <ul className="post-readers__list">
                {summary.notYetRead.map((reader) => (
                  <li key={reader.userId}>@{reader.handle}</li>
                ))}
              </ul>
            </section>
          )}

          {summary.readers.length > 0 && (
            <section>
              <h4 className="post-readers__heading">Đã xem ({summary.readers.length})</h4>
              <ul className="post-readers__list">
                {summary.readers.map((reader) => (
                  <li key={reader.userId}>
                    @{reader.handle}
                    {reader.readAt && (
                      <span className="post-readers__time">
                        {formatRelativeTime(reader.readAt)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
