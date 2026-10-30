import React, { useMemo } from 'react';
import { CitationItem } from '../chat-api';
import './citation-panel.css';

interface CitationPanelProps {
  citations: CitationItem[];
  onSelectCitation?: ((citation: CitationItem) => void) | undefined;
}

/** Turns `page:24` into something a reader recognises from a printed page. */
function readLocator(locator: string | undefined): string {
  if (!locator) return 'Tài liệu';
  return locator
    .replace('page:', 'Trang ')
    .replace('paragraph:', 'Đoạn ')
    .replace('line:', 'Dòng ');
}

/** The file a reader can go and open, never the opaque id behind it. */
function readTitle(citation: CitationItem): string {
  const name = citation.fileName;
  return name && name !== 'Tài liệu' ? name : 'Tài liệu tham khảo';
}

/**
 * The sources an answer rests on, set in the margin beside it.
 *
 * Printed scholarship puts its apparatus in the margin, and this is the same
 * problem: the reader is checking the claim against the source, so the source
 * has to be legible at the same time as the claim, not after scrolling past
 * it. The previous treatment was a row of pills below the answer, which reads
 * as a toolbar and hides the one thing that distinguishes this product from
 * any other assistant.
 *
 * Each entry is numbered in the seal red reserved for evidence. The number is
 * the mark, in the sense a footnote marker is a mark: small, repeated, and
 * the only saturated thing on the page.
 *
 * Duplicate entries for the same document and locator are folded together.
 * Retrieval returns one row per chunk, and two chunks from the same page of
 * the same file are one source to the person reading.
 */
export const CitationPanel: React.FC<CitationPanelProps> = ({ citations, onSelectCitation }) => {
  const unique = useMemo(() => {
    if (!citations) return [];
    const seen = new Set<string>();
    return citations.filter((c) => {
      const key = `${c.fileName || c.documentId || 'doc'}_${c.locator || c.excerpt.slice(0, 20)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [citations]);

  if (unique.length === 0) return null;

  return (
    <aside className="evidence-rail" aria-label={`Nguồn của câu trả lời (${unique.length})`}>
      <p className="evidence-rail__title">Nguồn</p>
      <ol className="evidence-rail__list">
        {unique.map((citation, index) => (
          <li className="evidence-rail__item" key={citation.citationId ?? index}>
            <button
              className="evidence-rail__entry"
              type="button"
              onClick={() => onSelectCitation?.(citation)}
            >
              <span className="evidence-rail__mark" aria-hidden="true">
                {index + 1}
              </span>
              <span className="evidence-rail__text">
                <span className="evidence-rail__file">{readTitle(citation)}</span>
                <span className="evidence-rail__locator">{readLocator(citation.locator)}</span>
                <span className="evidence-rail__excerpt">{citation.excerpt}</span>
                <span className="evidence-rail__score">
                  <span
                    className="evidence-rail__score-bar"
                    style={{ inlineSize: `${Math.round((citation.score || 0.75) * 100)}%` }}
                  />
                  <span className="evidence-rail__score-value">
                    {Math.round((citation.score || 0.75) * 100)}% khớp
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
};
