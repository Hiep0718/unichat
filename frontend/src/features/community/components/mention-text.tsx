/**
 * Markdown renderer that highlights `@handle` mentions.
 *
 * Mentions are plain text in the stored body, so the highlight is applied at
 * render time. Only text nodes are scanned, leaving code blocks and link URLs
 * untouched — an email inside a code fence should not light up as a mention.
 */
import { Fragment, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import './mention-text.css';

/** Same shape the server accepts: @ plus the email local-part. */
const MENTION = /@([A-Za-z0-9._-]{2,64})/g;

interface MentionTextProps {
  readonly children: string;
  /** Handles that belong to real members, so unknown ones stay plain text. */
  readonly knownHandles?: ReadonlySet<string>;
}

/** Wraps @handle occurrences in a highlight span. */
function highlight(text: string, knownHandles?: ReadonlySet<string>): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  MENTION.lastIndex = 0;
  while ((match = MENTION.exec(text)) !== null) {
    const handle = match[1] ?? '';
    const isKnown = !knownHandles || knownHandles.has(handle.toLowerCase());
    if (!isKnown) continue;

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span className="mention" key={`${match.index}-${handle}`}>
        @{handle}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (parts.length === 0) return text;
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
}

/** Recursively applies the highlight to text nodes only. */
function processNode(node: ReactNode, knownHandles?: ReadonlySet<string>): ReactNode {
  if (typeof node === 'string') return highlight(node, knownHandles);
  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <Fragment key={index}>{processNode(child, knownHandles)}</Fragment>
    ));
  }
  return node;
}

export function MentionText({ children, knownHandles }: MentionTextProps) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children: inner }) => <p>{processNode(inner, knownHandles)}</p>,
        li: ({ children: inner }) => <li>{processNode(inner, knownHandles)}</li>,
      }}
    >
      {children}
    </Markdown>
  );
}
