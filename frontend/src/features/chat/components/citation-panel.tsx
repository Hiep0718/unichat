import React from 'react';
import { CitationItem } from '../chat-api';
import './citation-panel.css';

interface CitationPanelProps {
  citations: CitationItem[];
}

export const CitationPanel: React.FC<CitationPanelProps> = ({ citations }) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="citation-panel">
      <div className="citation-panel__header">Trích dẫn nguồn tài liệu ({citations.length}):</div>
      <div className="citation-panel__list">
        {citations.map((c, idx) => (
          <div key={idx} className="citation-card">
            <div className="citation-card__title">
              <span>[{c.citationId}] {c.fileName || 'Tài liệu nguồn'} ({c.locator})</span>
              <span>Khớp: {(c.score * 100).toFixed(0)}%</span>
            </div>
            <div className="citation-card__excerpt">"{c.excerpt}"</div>
          </div>
        ))}
      </div>
    </div>
  );
};
