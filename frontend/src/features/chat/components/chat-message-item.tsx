import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { QuestionResponse, CitationItem } from '../chat-api';
import { CitationPanel } from './citation-panel';
import { RefusalCard } from './refusal-card';
import { MermaidDiagram } from './mermaid-diagram';

export interface MessageItem {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  response?: QuestionResponse;
  timestamp?: string;
}

const INTENT_MAP_VI: Record<string, string> = {
  FACT: 'Dữ liệu thực tế',
  DEFINITION: 'Định nghĩa',
  PROCEDURE: 'Quy trình',
  COMPARISON: 'So sánh',
  SUMMARIZATION: 'Tóm tắt',
  GENERAL: 'Tổng quan',
};

interface ChatMessageItemProps {
  message: MessageItem;
  onSelectCitation?: ((citation: CitationItem) => void) | undefined;
}

interface NotebookCitedTextProps {
  citedText: string;
  citNum: number;
  citation: CitationItem;
  onSelectCitation: (citation: CitationItem) => void;
}

/** NotebookLM Smart Cited Text with Dotted/Dashed Underline & Hover Popover Card */
const NotebookCitedText: React.FC<NotebookCitedTextProps> = ({
  citedText,
  citNum,
  citation,
  onSelectCitation,
}) => {
  const [hovered, setHovered] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const spanRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      // If distance from top of viewport to the element is less than 210px,
      // place popover BELOW to prevent clipping at the top header boundary.
      if (rect.top < 210) {
        setPlacement('bottom');
      } else {
        setPlacement('top');
      }
    }
    setHovered(true);
  };

  return (
    <span
      ref={spanRef}
      className={`notebook-cited-text-wrapper ${hovered ? 'notebook-cited-text-wrapper--hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelectCitation(citation)}
      role="button"
      tabIndex={0}
      title={`Tham khảo từ: ${citation.fileName || 'Tài liệu'}`}
    >
      <span className="notebook-cited-text">{citedText}</span>
      <button
        type="button"
        className="notebook-citation-chip"
        onClick={(e) => {
          e.stopPropagation();
          onSelectCitation(citation);
        }}
        aria-label={`Trích dẫn [${citNum}] từ ${citation.fileName || 'tài liệu'}`}
      >
        {citNum}
      </button>

      {hovered && (
        <div className={`notebook-citation-popover notebook-citation-popover--${placement}`}>
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

  const regex = /\[(\d+)\]/g;
  if (!regex.test(node)) {
    return node;
  }

  regex.lastIndex = 0;
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(node)) !== null) {
    const citNumStr = match[1];
    if (!citNumStr) continue;

    const citNum = parseInt(citNumStr, 10);
    const targetCit = citations[citNum - 1];
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    const precedingText = node.slice(lastIndex, matchStart);

    if (targetCit) {
      let splitIdx = 0;

      if (precedingText.length > 0) {
        let lastBoundary = -1;
        const matches = Array.from(precedingText.matchAll(/[\n.:;]\s*/g));
        if (matches.length > 0) {
          const lastM = matches[matches.length - 1];
          if (lastM && typeof lastM.index === 'number') {
            lastBoundary = lastM.index + lastM[0].length;
          }
        }

        if (lastBoundary > 0 && lastBoundary < precedingText.length) {
          splitIdx = lastBoundary;
        }
      }

      const unreferencedPrefix = precedingText.slice(0, splitIdx);
      const citedPhrase = precedingText.slice(splitIdx);

      if (unreferencedPrefix) {
        result.push(unreferencedPrefix);
      }

      result.push(
        <NotebookCitedText
          key={`${matchStart}-${citNum}`}
          citedText={citedPhrase}
          citNum={citNum}
          citation={targetCit}
          onSelectCitation={onSelectCitation}
        />
      );
    } else {
      result.push(node.slice(lastIndex, matchEnd));
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < node.length) {
    result.push(node.slice(lastIndex));
  }

  return result;
}

import aiAvatar from '../../../assets/ai-avatar.png';

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
          <img src={aiAvatar} alt="UniChat AI Logo" className="chat-msg__ai-avatar-img" />
        )}
      </div>

      <div className="chat-msg__content-zone">
        <div className="chat-msg__sender-meta">
          <span className="chat-msg__sender-name">{isUser ? 'Bạn' : 'UniChat AI Assistant'}</span>
          {message.timestamp && <span className="chat-msg__time">{message.timestamp}</span>}
          {!isUser && response?.intent && (
            <span className="chat-msg__intent-badge">
              {INTENT_MAP_VI[response.intent.toUpperCase()] || response.intent}
            </span>
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
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p({ children }) {
                    return <p>{React.Children.map(children, (child) => processTextNode(child, citations, onSelectCitation))}</p>;
                  },
                  li({ children }) {
                    return <li>{React.Children.map(children, (child) => processTextNode(child, citations, onSelectCitation))}</li>;
                  },
                  code({ className, children, ...rest }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const lang = match?.[1];
                    if (lang === 'mermaid') {
                      const chartCode = String(children).replace(/\n$/, '');
                      return <MermaidDiagram chart={chartCode} />;
                    }
                    // For other code blocks, render with syntax highlight class
                    if (lang) {
                      return (
                        <div className="chat-code-block">
                          <div className="chat-code-block__header">
                            <span className="chat-code-block__lang">{lang}</span>
                          </div>
                          <pre className="chat-code-block__pre">
                            <code className={className} {...rest}>{children}</code>
                          </pre>
                        </div>
                      );
                    }
                    return <code className={className} {...rest}>{children}</code>;
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
