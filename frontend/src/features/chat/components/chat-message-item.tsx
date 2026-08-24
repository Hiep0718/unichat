import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { QuestionResponse, CitationItem, SseThoughtPayload } from '../chat-api';
import { CitationPanel } from './citation-panel';
import { RefusalCard } from './refusal-card';
import { MermaidDiagram } from './mermaid-diagram';
import aiAvatar from '../../../assets/ai-avatar.png';

export interface MessageItem {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  response?: QuestionResponse | undefined;
  timestamp?: string | undefined;
  isStreaming?: boolean | undefined;
  thoughts?: SseThoughtPayload[] | undefined;
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
  onSelectPrompt?: ((prompt: string) => void) | undefined;
  onSaveNote?: ((title: string, content: string) => void) | undefined;
}

interface NotebookCitedTextProps {
  citedText: string;
  citNum: number;
  citation: CitationItem;
  onSelectCitation: (citation: CitationItem) => void;
}

/** Dedicated interactive follow-up suggestion panel */
interface SuggestionPanelProps {
  suggestions: string[];
  onSelectPrompt?: ((prompt: string) => void) | undefined;
}

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ suggestions, onSelectPrompt }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="chat-suggestions-panel">
      <div className="chat-suggestions-panel__header">
        <span className="chat-suggestions-panel__icon">💡</span>
        <span className="chat-suggestions-panel__title">Gợi ý câu hỏi & bước tiếp theo:</span>
      </div>
      <div className="chat-suggestions-panel__list">
        {suggestions.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            className="chat-suggestions-panel__item"
            onClick={() => onSelectPrompt?.(prompt)}
          >
            <span className="material-symbols-outlined chat-suggestions-panel__item-icon">auto_awesome</span>
            <span className="chat-suggestions-panel__item-text">{prompt}</span>
            <span className="material-symbols-outlined chat-suggestions-panel__arrow">arrow_forward</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/** Parse main markdown content and extract suggestion prompts separately */
function parseContentAndSuggestions(content: string): { mainContent: string; suggestions: string[] } {
  // Matches variations like: --- \n ### 💡 Gợi ý..., ### 💡 Gợi ý..., or 💡 **Gợi ý câu hỏi...
  const markerRegex = /\n*(?:---\n+)?(?:###\s*)?💡\s*(?:\*\*)?Gợi ý câu hỏi[^\n]*(?:\*\*)?\n*/i;
  const match = markerRegex.exec(content);

  if (!match) {
    return { mainContent: content, suggestions: [] };
  }

  const mainContent = content.slice(0, match.index).trim();
  const suggestionsText = content.slice(match.index + match[0].length).trim();

  const suggestions: string[] = [];
  const lines = suggestionsText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s*/.test(trimmed)) {
      let cleanPrompt = trimmed.replace(/^[-*\d.]+\s*/, '').trim();

      // Strip markdown bold/italic tags and prefixes like **Câu hỏi gợi ý 1:**, Gợi ý 1:, etc.
      cleanPrompt = cleanPrompt
        .replace(/^(?:\*\*)?(?:Câu hỏi gợi ý|Gợi ý|Câu hỏi|Bước)\s*\d+:(?:\*\*)?\s*/i, '')
        .replace(/^\[[^\]]+\]\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .trim();

      // Strip outer wrapping brackets if entire string is wrapped in []
      if (cleanPrompt.startsWith('[') && cleanPrompt.endsWith(']')) {
        cleanPrompt = cleanPrompt.slice(1, -1).trim();
      }
      // Strip any stray trailing ]
      cleanPrompt = cleanPrompt.replace(/\]$/, '').trim();

      if (cleanPrompt) {
        suggestions.push(cleanPrompt);
      }
    }
  }

  return { mainContent, suggestions };
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
  if (typeof node !== 'string') {
    return node;
  }

  const formatCursorInText = (text: string): React.ReactNode => {
    if (!text.includes('▌')) return text;
    const parts = text.split('▌');
    return (
      <>
        {parts[0]}
        <span className="chat-msg__streaming-cursor">▌</span>
        {parts[1] || null}
      </>
    );
  };

  if (!citations || citations.length === 0 || !onSelectCitation) {
    return formatCursorInText(node);
  }

  const regex = /\[(\d+)\]/g;
  if (!regex.test(node)) {
    return formatCursorInText(node);
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
        result.push(formatCursorInText(unreferencedPrefix));
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
      result.push(formatCursorInText(node.slice(lastIndex, matchEnd)));
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < node.length) {
    result.push(formatCursorInText(node.slice(lastIndex)));
  }

  return result;
}

interface ThinkingStep {
  icon: string;
  title: string;
  detail: string;
}

interface ThoughtsAccordionProps {
  isStreaming?: boolean | undefined;
  citationCount?: number | undefined;
  thoughts?: SseThoughtPayload[] | undefined;
  hasContent?: boolean | undefined;
}

const ThoughtsAccordion: React.FC<ThoughtsAccordionProps> = ({
  isStreaming = false,
  citationCount = 3,
  thoughts = [],
  hasContent = false,
}) => {
  // Always collapsed by default! Only expand when user explicitly clicks header.
  const [isOpen, setIsOpen] = useState(false);

  // Thinking is active ONLY when AI is streaming AND no answer text has rendered yet!
  const isThinkingActive = isStreaming && !hasContent;

  const targetStepIdx = useMemo(() => {
    if (!isThinkingActive) return 3;
    if (thoughts && thoughts.length > 0) return thoughts.length - 1;
    return 1;
  }, [isThinkingActive, thoughts]);

  // Smooth visual step index pacing transition
  const [visualStepIdx, setVisualStepIdx] = useState(0);

  useEffect(() => {
    if (!isThinkingActive) {
      setVisualStepIdx(3);
      return;
    }

    if (visualStepIdx < targetStepIdx) {
      const timer = setTimeout(() => {
        setVisualStepIdx((prev) => Math.min(prev + 1, targetStepIdx));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visualStepIdx, targetStepIdx, isThinkingActive]);

  const steps = useMemo<ThinkingStep[]>(() => {
    if (thoughts && thoughts.length > 0) {
      return thoughts.map((t) => ({
        icon:
          t.stepKey === 'INTENT'
            ? 'psychology'
            : t.stepKey === 'RETRIEVAL'
              ? 'manage_search'
              : t.stepKey === 'SYNTHESIS'
                ? 'auto_awesome'
                : 'verified',
        title: t.title,
        detail: t.detail,
      }));
    }

    return [
      {
        icon: 'psychology',
        title: 'Initiating Request & Intent Analysis',
        detail:
          'Hệ thống đang bóc tách ý định, phân tích từ khóa chuyên môn và khoanh vùng phạm vi tri thức RAG...',
      },
      {
        icon: 'manage_search',
        title: 'Retrieving & Grounding Sources',
        detail: `Đã quét kho tài liệu Vector DB, bóc tách ${citationCount || 3} trích dẫn tri thức có điểm tương đồng cao nhất.`,
      },
      {
        icon: 'auto_awesome',
        title: 'Synthesizing Key Concepts',
        detail:
          'Đang tổng hợp dữ kiện trích dẫn với tư duy logic học thuật, bóc tách cấu trúc, so sánh nguyên lý và xây dựng ví dụ...',
      },
      {
        icon: 'verified',
        title: 'Verifying Citations & Formatting Output',
        detail:
          'Đã xác thực trích dẫn [1], [2], tạo sơ đồ Mermaid trực quan và đề xuất 3 bước tiếp theo.',
      },
    ];
  }, [thoughts, citationCount]);

  // Only reveal steps that have ALREADY occurred or are currently occurring!
  const visibleSteps = useMemo(() => {
    const maxIdx = !isThinkingActive ? steps.length : visualStepIdx + 1;
    return steps.slice(0, maxIdx);
  }, [steps, visualStepIdx, isThinkingActive]);

  return (
    <div className={`chat-thoughts ${isOpen ? 'chat-thoughts--open' : ''}`}>
      <div className="chat-thoughts__header" onClick={() => setIsOpen((prev) => !prev)}>
        <div className="chat-thoughts__header-left">
          <span className="material-symbols-outlined chat-thoughts__header-icon">
            psychology
          </span>
          <span className="chat-thoughts__header-title">
            Thoughts (Quá trình Suy luận AI)
          </span>
          <span
            className={`chat-thoughts__status-badge ${
              isThinkingActive ? 'chat-thoughts__status-badge--active' : ''
            }`}
          >
            {isThinkingActive
              ? `⚡ Đang suy luận (Bước ${visualStepIdx + 1}/4)...`
              : `✅ Hoàn tất ${steps.length} bước`}
          </span>
        </div>
        <span className="material-symbols-outlined chat-thoughts__toggle-icon">
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="chat-thoughts__body">
          {visibleSteps.map((step, idx) => {
            const isDone = idx < visualStepIdx || !isThinkingActive;
            const isActive = isThinkingActive && idx === visualStepIdx;
            return (
              <div
                key={idx}
                className={`chat-thoughts__step ${
                  isActive ? 'chat-thoughts__step--active' : isDone ? 'chat-thoughts__step--done' : ''
                }`}
              >
                <div className="chat-thoughts__step-node">
                  {isDone ? '✓' : idx + 1}
                </div>
                <div className="chat-thoughts__step-content">
                  <div className="chat-thoughts__step-title">
                    <span>{step.title}</span>
                  </div>
                  <div className="chat-thoughts__step-detail">{step.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface CodeBlockProps {
  lang: string;
  codeString: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ lang, codeString }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeString]);

  return (
    <div className="chat-code-block">
      <div className="chat-code-block__header">
        <span className="chat-code-block__lang">{lang.toUpperCase()}</span>
        <button
          type="button"
          className={`chat-code-block__copy-btn ${copied ? 'chat-code-block__copy-btn--copied' : ''}`}
          onClick={handleCopy}
          title="Sao chép khối mã này"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
        </button>
      </div>
      <pre className="chat-code-block__pre">
        <code>{codeString}</code>
      </pre>
    </div>
  );
};

const playTextToSpeech = (
  text: string,
  onStart: () => void,
  onEnd: () => void
): (() => void) => {
  if (!('speechSynthesis' in window)) {
    alert('Trình duyệt của bạn chưa hỗ trợ tính năng đọc tự động (Text-to-Speech).');
    onEnd();
    return () => {};
  }

  window.speechSynthesis.cancel();

  // Split text into short sentences/chunks to avoid Chromium TTS silence freeze
  const rawChunks = text.split(/(?<=[.!?\n])\s+/);
  const chunks: string[] = [];
  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    if (trimmed.length > 180) {
      const words = trimmed.split(' ');
      let current = '';
      for (const w of words) {
        if ((current + ' ' + w).length > 180) {
          chunks.push(current);
          current = w;
        } else {
          current = current ? current + ' ' + w : w;
        }
      }
      if (current) chunks.push(current);
    } else {
      chunks.push(trimmed);
    }
  }

  if (chunks.length === 0) {
    onEnd();
    return () => {};
  }

  let isCancelled = false;
  let currentIndex = 0;

  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(
    (v) => v.lang.toLowerCase().includes('vi') || v.name.toLowerCase().includes('viet')
  );

  const speakNextChunk = () => {
    if (isCancelled || currentIndex >= chunks.length) {
      onEnd();
      return;
    }

    const chunkText = chunks[currentIndex];
    const utterance = new SpeechSynthesisUtterance(chunkText);
    utterance.rate = 1.0;

    if (viVoice) {
      utterance.voice = viVoice;
      utterance.lang = viVoice.lang;
    } else {
      utterance.lang = 'vi-VN';
    }

    utterance.onend = () => {
      currentIndex++;
      speakNextChunk();
    };

    utterance.onerror = (e) => {
      console.warn('TTS Chunk error, skipping chunk:', e);
      currentIndex++;
      speakNextChunk();
    };

    window.speechSynthesis.speak(utterance);
  };

  onStart();

  setTimeout(() => {
    if (isCancelled) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    speakNextChunk();
  }, 100);

  return () => {
    isCancelled = true;
    window.speechSynthesis.cancel();
  };
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onSelectCitation,
  onSelectPrompt,
  onSaveNote,
}) => {
  const isUser = message.role === 'USER';
  const response = message.response;
  const citations = response?.citations;

  const { mainContent, suggestions } = useMemo(
    () => parseContentAndSuggestions(message.content),
    [message.content]
  );

  const [copiedMsg, setCopiedMsg] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ttsCancelRef = useRef<(() => void) | null>(null);

  // Pre-load Web Speech voices on mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const warmVoices = () => {
        window.speechSynthesis.getVoices();
      };
      warmVoices();
      window.speechSynthesis.onvoiceschanged = warmVoices;
    }
  }, []);

  const handleCopyAnswer = useCallback(() => {
    if (!message.content) return;
    const cleanText = mainContent.replace(/```[\s\S]*?```/g, '');
    navigator.clipboard.writeText(cleanText.trim());
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  }, [mainContent, message.content]);

  const handleToggleSpeech = useCallback(() => {
    if (isSpeaking) {
      if (ttsCancelRef.current) {
        ttsCancelRef.current();
        ttsCancelRef.current = null;
      }
      setIsSpeaking(false);
      return;
    }

    // Fail-safe strip Emojis & Markdown symbols
    const speakableText = mainContent
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s*\[\d+\]/g, '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .replace(/[\u2600-\u27BF]/g, '')
      .replace(/[*#_~>|]/g, '')
      .trim();

    if (!speakableText) return;

    ttsCancelRef.current = playTextToSpeech(
      speakableText,
      () => setIsSpeaking(true),
      () => {
        setIsSpeaking(false);
        ttsCancelRef.current = null;
      }
    );
  }, [mainContent, isSpeaking]);

  useEffect(() => {
    return () => {
      if (ttsCancelRef.current) {
        ttsCancelRef.current();
      }
    };
  }, []);

  const isUnclosedCodeBlock = (mainContent.match(/```/g) || []).length % 2 !== 0;
  const displayContent =
    message.isStreaming && mainContent && !isUnclosedCodeBlock
      ? `${mainContent} ▌`
      : mainContent;

  return (
    <div className={`chat-msg ${isUser ? 'chat-msg--user' : 'chat-msg--assistant'}`} data-msg-id={message.id}>
      <div className="chat-msg__avatar">
        {isUser ? (
          <div className="chat-msg__avatar-user">
            <span className="material-symbols-outlined">person</span>
          </div>
        ) : (
          <img src={aiAvatar} alt="UniChat AI Assistant" className="chat-msg__avatar-img" />
        )}
      </div>

      <div className="chat-msg__content">
        <div className="chat-msg__header">
          <span className="chat-msg__author">
            {isUser ? 'Bạn' : 'UniChat AI Assistant'}
          </span>
          {message.timestamp && <span className="chat-msg__time">{message.timestamp}</span>}

          {!isUser && response && (
            <div className="chat-msg__meta-badges">
              {response.intent && (
                <span className="chat-badge chat-badge--intent" title="Phân loại ý định RAG">
                  <span className="material-symbols-outlined chat-badge__icon">psychology</span>
                  {INTENT_MAP_VI[response.intent] || response.intent}
                </span>
              )}
              {response.evidenceScore !== undefined && response.evidenceScore !== null && (
                <span
                  className={`chat-badge chat-badge--score ${
                    response.evidenceScore >= 0.7
                      ? 'chat-badge--score-high'
                      : response.evidenceScore >= 0.4
                        ? 'chat-badge--score-medium'
                        : 'chat-badge--score-low'
                  }`}
                  title="Điểm số bằng chứng trích dẫn"
                >
                  <span className="material-symbols-outlined chat-badge__icon">verified</span>
                  {Math.round(response.evidenceScore * 100)}%
                </span>
              )}
            </div>
          )}
        </div>

        {!isUser && (
          <ThoughtsAccordion
            isStreaming={message.isStreaming}
            citationCount={citations?.length}
            thoughts={message.thoughts}
            hasContent={Boolean(message.content && message.content.trim().length > 0)}
          />
        )}

        {(!isUser && !message.content && message.isStreaming) ? null : (
          <div className="chat-msg__bubble">
            {isUser ? (
              <div className="chat-msg__text">{message.content}</div>
            ) : response && (response.decision === 'REFUSE' || response.decision === 'CLARIFY') ? (
              <RefusalCard
                decision={response.decision}
                refusalReason={response.refusalReason || message.content}
              />
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
                  blockquote({ children }) {
                    return <div>{children}</div>;
                  },
                  code({ className, children, ...rest }) {
                    const codeText = String(children).replace(/\n$/, '');
                    const match = /language-(\w+)/.exec(className || '');
                    const lang = match?.[1];

                    if (lang === 'mermaid') {
                      return <MermaidDiagram chart={codeText} isStreaming={message.isStreaming} />;
                    }

                    const isBlock = Boolean(lang) || codeText.includes('\n') || Boolean(className && className.includes('language-'));
                    if (isBlock) {
                      return <CodeBlock lang={lang || 'CODE'} codeString={codeText} />;
                    }

                    return <code className={`chat-inline-code ${className || ''}`} {...rest}>{children}</code>;
                  },
                }}
              >
                {displayContent || (!message.isStreaming ? (response?.refusalReason || 'Không thể lấy câu trả lời từ hệ thống. Vui lòng thử lại sau.') : '')}
              </Markdown>

              {suggestions.length > 0 && (
                <SuggestionPanel
                  suggestions={suggestions}
                  onSelectPrompt={onSelectPrompt}
                />
              )}
            </div>
          )}
        </div>
        )}

        {!isUser && response && response.decision === 'ANSWER' && citations && citations.length > 0 && (
          <CitationPanel
            citations={citations}
            onSelectCitation={onSelectCitation}
          />
        )}

        {!isUser && message.content && !message.isStreaming && (
          <div className="chat-msg__actions">
            <button
              type="button"
              className={`chat-msg__action-btn ${copiedMsg ? 'chat-msg__action-btn--active' : ''}`}
              onClick={handleCopyAnswer}
              title="Sao chép câu trả lời"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                {copiedMsg ? 'check' : 'content_copy'}
              </span>
              <span>{copiedMsg ? 'Đã sao chép' : 'Sao chép câu trả lời'}</span>
            </button>

            <button
              type="button"
              className={`chat-msg__action-btn ${isSpeaking ? 'chat-msg__action-btn--speaking' : ''}`}
              onClick={handleToggleSpeech}
              title={isSpeaking ? 'Dừng đọc' : 'Đọc câu trả lời'}
            >
              <span className={`material-symbols-outlined ${isSpeaking ? 'chat-msg__speaking-icon' : ''}`} style={{ fontSize: '16px' }}>
                {isSpeaking ? 'volume_up' : 'volume_up'}
              </span>
              <span>{isSpeaking ? 'Dừng đọc' : 'Đọc cho tôi nghe'}</span>
            </button>

            {onSaveNote && (
              <button
                type="button"
                className="chat-msg__action-btn"
                onClick={() => onSaveNote(`Ghi chú AI (${message.timestamp || 'Mới'})`, mainContent)}
                title="Lưu câu trả lời này vào Sổ Ghi Chú Studio"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#0284c7' }}>
                  push_pin
                </span>
                <span>Lưu vào Ghi chú</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
