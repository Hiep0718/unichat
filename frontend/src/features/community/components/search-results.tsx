/**
 * Results of one search across posts and documents.
 *
 * Finding something used to mean remembering whether it was said in a thread or
 * uploaded as a file — a distinction the person searching does not have in
 * mind. The two kinds stay in separate sections rather than being merged into
 * one ranked list: they are not comparable, and someone after a file wants to
 * see files, not a file ranked below three discussions that mention it.
 */
import { useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';
import { fetchSearchResults } from '../community-api';
import type { DocumentHit, PostHit, SearchResults as Results } from '../community-api';
import './search-results.css';

interface SearchResultsProps {
  readonly query: string;
  readonly onOpenPost: (workspaceId: string, postId: string) => void;
  readonly onOpenDocuments: (workspaceId: string) => void;
}

/** One value rather than two flags, so no state is reset inside the effect. */
type SearchState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly results: Results }
  | { readonly status: 'failed' };

export function SearchResults({ query, onOpenPost, onOpenDocuments }: SearchResultsProps) {
  const [state, setState] = useState<SearchState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetchSearchResults(query)
      .then((found) => {
        if (!cancelled) setState({ status: 'ready', results: found });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'failed' });
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  if (state.status === 'failed') {
    return (
      <p className="search-results__state">
        <Icon name="error_outline" size={18} /> Không tìm kiếm được. Vui lòng thử lại.
      </p>
    );
  }

  if (state.status === 'loading') {
    return <p className="search-results__state">Đang tìm...</p>;
  }

  const { results } = state;
  const total = results.posts.length + results.documents.length;
  if (total === 0) {
    return (
      <p className="search-results__state">
        <Icon name="search_off" size={18} /> Không tìm thấy kết quả cho “{query}”.
      </p>
    );
  }

  return (
    <div className="search-results">
      {results.posts.length > 0 && (
        <section className="search-results__section">
          <h2 className="search-results__heading">
            <Icon name="forum" size={16} /> Bài viết ({results.posts.length})
          </h2>
          {results.posts.map((post) => (
            <PostRow key={post.id} post={post} onOpen={onOpenPost} />
          ))}
        </section>
      )}

      {results.documents.length > 0 && (
        <section className="search-results__section">
          <h2 className="search-results__heading">
            <Icon name="description" size={16} /> Tài liệu ({results.documents.length})
          </h2>
          {results.documents.map((document) => (
            <DocumentRow key={document.id} document={document} onOpen={onOpenDocuments} />
          ))}
        </section>
      )}
    </div>
  );
}

function PostRow({
  post,
  onOpen,
}: {
  readonly post: PostHit;
  readonly onOpen: (workspaceId: string, postId: string) => void;
}) {
  return (
    <button
      type="button"
      className="search-results__row"
      onClick={() => onOpen(post.workspaceId, post.id)}
    >
      <span className="search-results__row-title">
        {post.title}
        {post.resolved && (
          <span className="search-results__badge">
            <Icon name="check_circle" size={12} /> Đã có lời giải
          </span>
        )}
      </span>
      <span className="search-results__row-snippet">{post.snippet}</span>
      <span className="search-results__row-meta">
        {post.workspaceName} · {post.replyCount} bình luận ·{' '}
        {formatRelativeTime(post.createdAt)}
      </span>
    </button>
  );
}

function DocumentRow({
  document,
  onOpen,
}: {
  readonly document: DocumentHit;
  readonly onOpen: (workspaceId: string) => void;
}) {
  return (
    <button
      type="button"
      className="search-results__row"
      onClick={() => onOpen(document.workspaceId)}
    >
      <span className="search-results__row-title">{document.originalName}</span>
      <span className="search-results__row-meta">
        {document.workspaceName} ·{' '}
        {document.readableByAi ? (
          <span className="search-results__readable">
            <Icon name="auto_awesome" size={12} /> Trợ lý AI đọc được
          </span>
        ) : (
          'Chưa được duyệt'
        )}
      </span>
    </button>
  );
}
