/**
 * Sources behind an assistant reply in a discussion thread.
 *
 * The answer itself is only as good as what a reader can check, so each source
 * shows the document it came from and opens its excerpt on demand.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import type { ReplyCitation } from '../community-api';
import './reply-citations.css';

interface ReplyCitationsProps {
  readonly citations: ReplyCitation[];
}

export function ReplyCitations({ citations }: ReplyCitationsProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (citations.length === 0) {
    return null;
  }

  const toggle = (id: string) => setOpenId((current) => (current === id ? null : id));

  return (
    <div className="reply-citations">
      <span className="reply-citations__label">
        <Icon name="menu_book" size={14} /> Nguồn ({citations.length})
      </span>
      <ul className="reply-citations__list">
        {citations.map((citation) => (
          <li key={citation.citationId} className="reply-citations__item">
            <button
              type="button"
              className="reply-citations__chip"
              onClick={() => toggle(citation.citationId)}
              aria-expanded={openId === citation.citationId}
            >
              <span className="reply-citations__index">[{citation.citationId}]</span>
              <span className="reply-citations__file">{citation.fileName}</span>
              {citation.locator && (
                <span className="reply-citations__locator">{citation.locator}</span>
              )}
              <Icon name={openId === citation.citationId ? 'expand_less' : 'expand_more'} size={14} />
            </button>
            {openId === citation.citationId && citation.excerpt && (
              <p className="reply-citations__excerpt">{citation.excerpt}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
