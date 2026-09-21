/**
 * What the composer can tell someone before they post.
 *
 * A group where the same question is asked five times is a group where nobody
 * finds the answer the sixth time. This shows matching posts as the title is
 * typed, and says whether the assistant has anything to read here at all.
 */
import { useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { fetchComposeSuggestions } from '../community-api';
import type { ComposeSuggestion } from '../community-api';
import './compose-suggestions.css';

/** Matches the input debounce required by the engineering standards. */
const DEBOUNCE_MS = 300;

interface ComposeSuggestionsProps {
  readonly workspaceId: string;
  /** The draft title being typed. */
  readonly draft: string;
  /** Opens an existing post so the author can read it instead of posting. */
  readonly onOpenPost: (discussionId: string) => void;
}

export function ComposeSuggestions({
  workspaceId,
  draft,
  onOpenPost,
}: ComposeSuggestionsProps) {
  const [suggestion, setSuggestion] = useState<ComposeSuggestion | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchComposeSuggestions(workspaceId, draft)
        .then((result) => {
          if (!cancelled) setSuggestion(result);
        })
        .catch(() => {
          // A suggestion is an aid, not a requirement: a failed lookup must
          // never block someone from posting.
          if (!cancelled) setSuggestion(null);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [workspaceId, draft]);

  if (!suggestion) {
    return null;
  }

  const { similarPosts, documentCount } = suggestion;

  return (
    <div className="compose-suggestions">
      <LibraryHint documentCount={documentCount} />

      {similarPosts.length > 0 && (
        <div className="compose-suggestions__matches">
          <p className="compose-suggestions__heading">
            <Icon name="lightbulb" size={15} />
            Đã có {similarPosts.length} bài tương tự trong nhóm
          </p>
          <ul className="compose-suggestions__list">
            {similarPosts.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  className="compose-suggestions__item"
                  onClick={() => onOpenPost(post.id)}
                >
                  <span className="compose-suggestions__item-title">{post.title}</span>
                  <span className="compose-suggestions__item-meta">
                    {post.resolved ? (
                      <span className="compose-suggestions__resolved">
                        <Icon name="check_circle" size={13} /> Đã có lời giải
                      </span>
                    ) : (
                      `${post.replyCount} bình luận`
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Says whether the assistant has documents to answer from in this group. */
function LibraryHint({ documentCount }: { readonly documentCount: number }) {
  if (documentCount === 0) {
    return (
      <p className="compose-suggestions__library compose-suggestions__library--empty">
        <Icon name="info" size={14} />
        Nhóm chưa có tài liệu nào được duyệt, nên trợ lý AI chưa trả lời được.
      </p>
    );
  }

  return (
    <p className="compose-suggestions__library">
      <Icon name="auto_awesome" size={14} />
      Nhóm có {documentCount} tài liệu — có thể nhắc <strong>@AI</strong> trong bình luận để hỏi.
    </p>
  );
}
