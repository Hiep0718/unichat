import React from 'react';
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

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, onSelectCitation }) => {
  const isUser = message.role === 'USER';
  const response = message.response;

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
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>
          )}
        </div>

        {!isUser && response && response.decision === 'ANSWER' && response.citations && response.citations.length > 0 && (
          <CitationPanel
            citations={response.citations}
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
