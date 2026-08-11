import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { QuestionResponse, CitationItem } from '../chat-api';
import { CitationPanel } from './citation-panel';
import { RefusalCard } from './refusal-card';

export interface MessageItem {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  response?: QuestionResponse;
  timestamp?: string;
}

interface ChatMessageItemProps {
  message: MessageItem;
  onSelectCitation?: ((citation: CitationItem) => void) | undefined;
}

interface NotebookCitationChipProps {
  citNum: number;
  citation: CitationItem;
  onSelectCitation: (citation: CitationItem) => void;
}

/** NotebookLM Smart Citation Chip with Hover Popover Card & "Xem nguồn" Action */
const NotebookCitationChip: React.FC<NotebookCitationChipProps> = ({
  citNum,
  citation,
  onSelectCitation,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="notebook-citation-wrapper"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="notebook-citation-chip"
        onClick={() => onSelectCitation(citation)}
        aria-label={`Trích dẫn [${citNum}] từ ${citation.fileName || 'tài liệu'}`}
      >
        {citNum}
      </button>

      {hovered && (
        <div className="notebook-citation-popover">
          <div className="notebook-citation-popover__header">
            <span className="material-symbols-outlined notebook-citation-popover__icon">description</span>
            <span className="notebook-citation-popover__filename" title={citation.fileName}>
              {citation.fileName || 'Tài liệu tham khảo'}
            </span>
          </div>
          <div className="notebook-citation-popover__excerpt">
            "{citation.excerpt}"
          </div>
          <div className="notebook-citation-popover__footer">
            <button
              type="button"
              className="notebook-citation-popover__action"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCitation(citation);
              }}
            >
              <span>Xem nguồn</span>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </span>
  );
};

function processTextNode(
  node: React.ReactNode,
  citations?: CitationItem[],
  onSelectCitation?: (citation: CitationItem) => void
): React.ReactNode {
  if (typeof node !== 'string' || !citations || citations.length === 0 || !onSelectCitation) {
    return node;
  }

  const parts = node.split(/(\[\d+\])/g);
  if (parts.length === 1) return node;

  return parts.map((part, idx) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match && match[1]) {
      const citNum = parseInt(match[1], 10);
      const targetCit = citations[citNum - 1];
      if (targetCit) {
        return (
          <NotebookCitationChip
            key={idx}
            citNum={citNum}
            citation={targetCit}
            onSelectCitation={onSelectCitation}
          />
        );
      }
    }
    return part;
  });
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, onSelectCitation }) => {
  const isUser = message.role === 'USER';
  const response = message.response;
  const citations = response?.citations;

  return (
    <div className={`chat-msg chat-msg--${isUser ? 'user' : 'assistant'}`}>
      <div className="chat-msg__avatar">
        {isUser ? (
          <span className="material-symbols-outlined">person</span>
        ) : (
          <span className="material-symbols-outlined">smart_toy</span>
        )}
      </div>

      <div className="chat-msg__content-zone">
        <div className="chat-msg__sender-meta">
          <span className="chat-msg__sender-name">{isUser ? 'Bạn' : 'UniChat AI Assistant'}</span>
          {message.timestamp && <span className="chat-msg__time">{message.timestamp}</span>}
          {!isUser && response?.intent && (
            <span className="chat-msg__intent-badge">{response.intent}</span>
          )}
          {!isUser && response?.providerModel && (
            <span className="chat-msg__model-tag">🤖 {response.providerModel}</span>
          )}
        </div>

        <div className="chat-msg__bubble">
          {isUser ? (
            <div className="chat-msg__text">{message.content}</div>
          ) : (
            <div className="chat-msg__markdown">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p({ children }) {
                    return <p>{React.Children.map(children, (child) => processTextNode(child, citations, onSelectCitation))}</p>;
                  },
                  li({ children }) {
                    return <li>{React.Children.map(children, (child) => processTextNode(child, citations, onSelectCitation))}</li>;
                  },
                }}
              >
                {message.content}
              </Markdown>
            </div>
          )}
        </div>

        {!isUser && response && response.decision === 'ANSWER' && citations && citations.length > 0 && (
          <CitationPanel
            citations={citations}
            onSelectCitation={onSelectCitation}
          />
        )}

        {!isUser && response && (response.decision === 'REFUSE' || response.decision === 'CLARIFY') && (
          <RefusalCard
            decision={response.decision}
            refusalReason={response.refusalReason}
          />
        )}
      </div>
    </div>
  );
};
