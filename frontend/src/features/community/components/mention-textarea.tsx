/**
 * Textarea that suggests group members when the writer types `@`.
 *
 * The suggestion list is filtered against the handle being typed and inserts
 * the completed handle at the caret, so what gets stored matches exactly what
 * the server resolves mentions against.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchMentionableMembers } from '../community-api';
import type { MentionableMember } from '../community-api';
import './mention-textarea.css';

interface MentionTextareaProps {
  readonly workspaceId: string | null | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly rows?: number;
  readonly required?: boolean;
  readonly autoFocus?: boolean | undefined;
  readonly className?: string;
  readonly id?: string;
}

/** Matches the handle being typed immediately before the caret. */
const TRAILING_MENTION = /@([A-Za-z0-9._-]*)$/;

const MAX_SUGGESTIONS = 6;

export function MentionTextarea({
  workspaceId,
  value,
  onChange,
  placeholder,
  rows = 5,
  required,
  autoFocus,
  className,
  id,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [members, setMembers] = useState<MentionableMember[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  // Load the roster once per workspace; it is small and rarely changes.
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    fetchMentionableMembers(workspaceId)
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch(() => {
        // Suggestions are a convenience: typing the handle by hand still works.
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const suggestions = useMemo(() => {
    if (query === null) return [];
    const needle = query.toLowerCase();
    return members
      .filter((m) => m.handle.startsWith(needle))
      .slice(0, MAX_SUGGESTIONS);
  }, [members, query]);

  const updateQuery = (text: string, caret: number) => {
    const match = TRAILING_MENTION.exec(text.slice(0, caret));
    setQuery(match ? (match[1] ?? '') : null);
    setHighlighted(0);
  };

  const insert = (handle: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const caret = textarea.selectionStart;
    const before = value.slice(0, caret).replace(TRAILING_MENTION, `@${handle} `);
    const next = before + value.slice(caret);

    onChange(next);
    setQuery(null);

    // Put the caret straight after the inserted handle.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(before.length, before.length);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((index) => (index + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const chosen = suggestions[highlighted];
      if (chosen) {
        e.preventDefault();
        insert(chosen.handle);
      }
    } else if (e.key === 'Escape') {
      setQuery(null);
    }
  };

  return (
    <div className="mention-input">
      <textarea
        id={id}
        ref={textareaRef}
        className={className}
        value={value}
        rows={rows}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value);
          updateQuery(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
      />

      {suggestions.length > 0 && (
        <ul className="mention-input__list" role="listbox">
          {suggestions.map((member, index) => (
            <li key={member.userId}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlighted}
                className={`mention-input__item ${index === highlighted ? 'mention-input__item--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(member.handle)}
              >
                @{member.handle}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
