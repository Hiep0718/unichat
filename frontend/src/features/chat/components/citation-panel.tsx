/**
 * Citation panel displaying source references for RAG answers.
 */

import React from 'react';

import { Icon } from '../../../components/icon';
import { CitationItem } from '../chat-api';
import './citation-panel.css';

interface CitationPanelProps {
  citations: CitationItem[];
}

/**
 * Renders the citation list with gradient accent, score badge, and hover effects.
 */
export const CitationPanel: React.FC<CitationPanelProps> = ({ citations }) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="citation-panel">
      <div className="citation-panel__header">
        <Icon name="menu_book" size={16} />
        Trích dẫn nguồn tài liệu ({citations.length}):
      </div>
      <div className="citation-panel__list">
        {citations.map((c, idx) => (
          <div key={idx} className="citation-card">
            <div className="citation-card__title">
              <span>[{c.citationId}] {c.fileName || 'Tài liệu nguồn'} ({c.locator})</span>
              <span className="citation-card__score">Khớp: {(c.score * 100).toFixed(0)}%</span>
            </div>
            <div className="citation-card__excerpt">&quot;{c.excerpt}&quot;</div>
          </div>
        ))}
      </div>
    </div>
  );
};
