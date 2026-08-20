import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { askWorkspaceQuestion, askWorkspaceQuestionStream, CitationItem, QuestionResponse } from './chat-api';
import { ChatHeader } from './components/chat-header';
import { ChatWelcome } from './components/chat-welcome';
import { ChatMessageItem, MessageItem } from './components/chat-message-item';
import { ChatInputForm } from './components/chat-input-form';
import { CitationDrawer } from './components/citation-drawer';
import { useWorkspace } from '../workspaces/workspace-context';
import { fetchConversationDetail } from '../history/conversation-api';
import aiAvatar from '../../assets/ai-avatar.png';
import './chat-page.css';

interface ChatPageProps {
  workspaceId?: string | undefined;
  conversationId?: string | undefined;
}

const ChatSkeletonLoader: React.FC = () => (
  <div className="chat-skeleton-container" aria-label="Đang tải lịch sử trò chuyện...">
    <div className="chat-skeleton-item chat-skeleton-item--assistant">
      <div className="chat-skeleton-avatar"></div>
      <div className="chat-skeleton-content">
        <div className="chat-skeleton-line chat-skeleton-line--short"></div>
        <div className="chat-skeleton-bubble">
          <div className="chat-skeleton-line"></div>
          <div className="chat-skeleton-line"></div>
          <div className="chat-skeleton-line chat-skeleton-line--medium"></div>
        </div>
      </div>
    </div>
    <div className="chat-skeleton-item chat-skeleton-item--user">
      <div className="chat-skeleton-content">
        <div className="chat-skeleton-bubble">
          <div className="chat-skeleton-line chat-skeleton-line--medium"></div>
        </div>
      </div>
    </div>
  </div>
);

export const ChatPage: React.FC<ChatPageProps> = ({
  workspaceId: propWorkspaceId,
  conversationId: propConversationId,
}) => {
  const params = useParams<{ workspaceId?: string; conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const workspaceContext = useWorkspace();

  const targetWorkspaceId = propWorkspaceId || params.workspaceId || workspaceContext?.workspace?.id;
  const targetConversationId =
    propConversationId || params.conversationId || searchParams.get('conversationId') || undefined;

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(targetConversationId));
  const [conversationId, setConversationId] = useState<string | undefined>(targetConversationId);
  const [conversationTitle, setConversationTitle] = useState<string | undefined>(undefined);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, 60);
  };

  useEffect(() => {
    if (!targetWorkspaceId) {
      setInitialLoading(false);
      return;
    }

    let isMounted = true;

    if (targetConversationId) {
      setInitialLoading(true);
      setConversationId(targetConversationId);

      fetchConversationDetail(targetWorkspaceId, targetConversationId)
        .then((detail) => {
          if (!isMounted || !detail) return;
          setConversationTitle(detail.title);
          const loadedMessages: MessageItem[] = (detail.messages || []).map((m) => {
            const item: MessageItem = {
              id: m.id,
              role: m.role,
              content: m.content,
            };
            if (m.role === 'ASSISTANT') {
              const isRefusal = Boolean(m.refusalCode);
              const isClarify = m.refusalCode === 'CLARIFY_REQUIRED';
              item.response = {
                messageId: m.id,
                conversationId: detail.id,
                decision: isClarify ? 'CLARIFY' : (isRefusal ? 'REFUSE' : 'ANSWER'),
                answer: isRefusal ? null : m.content,
                intent: m.intent || 'FACT',
                strategyVersion: 'v1.0',
                providerModel: m.providerModel || 'gemini-2.5-flash',
                citations: (m.citations || []).map((c, i) => ({
                  citationId: String(i + 1),
                  documentId: c.documentId || '',
                  fileName: c.fileName || 'Tài liệu',
                  locator: c.locator || '',
                  excerpt: c.excerpt || '',
                  score: c.score || 0.75,
                })),
                refusalCode: m.refusalCode || null,
                refusalReason: isRefusal ? m.content : null,
                requestId: 'history',
              };
            }
            return item;
          });
          setMessages(loadedMessages);
        })
        .catch((err) => {
          console.error('Lỗi tải cuộc trò chuyện:', err);
        })
        .finally(() => {
          if (isMounted) {
            setInitialLoading(false);
            scrollToBottom(false);
          }
        });
    } else {
      // Start fresh new conversation
      setConversationId(undefined);
      setConversationTitle(undefined);
      setMessages([]);
      setInitialLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [targetWorkspaceId, targetConversationId]);

  useEffect(() => {
    if (!initialLoading && messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length, loading, initialLoading]);

  if (!targetWorkspaceId) {
    return <div className="chat-page__error">Lỗi: Không tìm thấy Workspace ID</div>;
  }

  const handleSendQuestion = async (userText: string, allowExternalKnowledge: boolean = true) => {
    if (loading) return;
    setLoading(true);

    const userMsg: MessageItem = {
      id: Date.now().toString(),
      role: 'USER',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMsgId = `${Date.now()}-assistant`;
    const initialAssistantMsg: MessageItem = {
      id: assistantMsgId,
      role: 'ASSISTANT',
      content: '',
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    scrollToBottom(true);

    let tokenBuffer = '';
    let isStreamDone = false;
    let streamHasError = false;
    let tokensReceived = false;

    // Typewriter Queue Ticker (~15ms interval for smooth character rải)
    const ticker = setInterval(() => {
      if (tokenBuffer.length > 0) {
        // Take 1 to 3 characters per tick for smooth typewriter speed
        const chunkSize = tokenBuffer.length > 30 ? 3 : 1;
        const charSegment = tokenBuffer.slice(0, chunkSize);
        tokenBuffer = tokenBuffer.slice(chunkSize);

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: m.content + charSegment } : m))
        );
        scrollToBottom(true);
      } else if (isStreamDone || streamHasError) {
        clearInterval(ticker);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
        );
        setLoading(false);
        scrollToBottom(true);
      }
    }, 15);

    try {
      await askWorkspaceQuestionStream(
        targetWorkspaceId,
        {
          question: userText,
          conversationId,
          allowExternalKnowledge,
        },
        {
          onMetadata: (meta) => {
            tokensReceived = true;
            if (meta.conversationId && !conversationId) {
              setConversationId(meta.conversationId);
            }

            const partialResp: QuestionResponse = {
              messageId: assistantMsgId,
              conversationId: meta.conversationId || conversationId || '',
              decision: meta.decision || 'ANSWER',
              answer: null,
              intent: meta.intent || 'FACT',
              strategyVersion: meta.strategyVersion || 'v1.0',
              citations: meta.citations || [],
              refusalCode: meta.refusalCode || null,
              refusalReason: meta.refusalReason || null,
              providerModel: meta.providerModel || 'gemini-2.5-flash',
              evidenceScore: meta.evidenceScore,
              requestId: meta.requestId || 'stream',
            };

            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, response: partialResp } : m))
            );

            if (meta.decision === 'REFUSE' || meta.decision === 'CLARIFY') {
              if (meta.refusalReason) {
                tokenBuffer += meta.refusalReason;
              }
            }
          },
          onToken: (delta) => {
            tokensReceived = true;
            tokenBuffer += delta;
          },
          onDone: (done) => {
            if (done.conversationId && !conversationId) {
              setConversationId(done.conversationId);
            }
            isStreamDone = true;
          },
          onError: (err) => {
            console.warn('SSE stream error, handling fallback...', err);
            streamHasError = true;
          },
        }
      );
    } catch (streamErr: unknown) {
      if (!tokensReceived) {
        // Fallback to REST POST non-streaming if stream connection fails before tokens
        try {
          const res = await askWorkspaceQuestion(targetWorkspaceId, {
            question: userText,
            conversationId,
            allowExternalKnowledge,
          });

          if (!conversationId && res.conversationId) {
            setConversationId(res.conversationId);
          }

          tokenBuffer = res.answer || res.refusalReason || 'Không có câu trả lời';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    id: res.messageId,
                    response: res,
                  }
                : m
            )
          );
        } catch (fallbackErr: unknown) {
          const errorText = fallbackErr instanceof Error ? fallbackErr.message : 'Đã xảy ra lỗi khi kết nối AI';
          tokenBuffer = errorText;
        } finally {
          isStreamDone = true;
        }
      } else {
        isStreamDone = true;
      }
    }
  };

  const handleNewChat = () => {
    setConversationId(undefined);
    setConversationTitle(undefined);
    setMessages([]);
    setSelectedCitation(null);
  };

  return (
    <div className={`chat-layout ${selectedCitation ? 'chat-layout--split' : ''}`}>
      <div className="chat-page">
        <ChatHeader
          workspaceName={workspaceContext?.workspace?.name}
          conversationTitle={conversationTitle}
          messageCount={messages.length}
          onNewChat={handleNewChat}
          onToggleDrawer={selectedCitation ? () => setSelectedCitation(null) : undefined}
          hasDrawerOpen={Boolean(selectedCitation)}
        />

        <div className="chat-page__messages-body">
          {initialLoading ? (
            <ChatSkeletonLoader />
          ) : messages.length === 0 ? (
            <ChatWelcome onSelectPrompt={handleSendQuestion} />
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  onSelectCitation={(cit) => setSelectedCitation(cit)}
                  onSelectPrompt={handleSendQuestion}
                />
              ))}
              {loading && (
                <div className="chat-msg chat-msg--assistant chat-msg--thinking">
                  <div className="chat-msg__avatar">
                    <img src={aiAvatar} alt="UniChat AI Logo" className="chat-msg__ai-avatar-img" />
                  </div>

                  <div className="chat-msg__content-zone">
                    <div className="chat-msg__sender-meta">
                      <span className="chat-msg__sender-name">UniChat AI Assistant</span>
                      <span className="chat-msg__model-tag">🤖 Gemini 3.5 Flash</span>
                    </div>

                    <div className="chat-msg__bubble chat-msg__bubble--thinking">
                      <div className="chat-msg__thinking-dots">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                      </div>
                      <span className="chat-msg__thinking-text">
                        UniChat AI đang truy xuất vector & suy luận từ kho tài liệu...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} style={{ height: 1, width: '100%' }} />
        </div>

        <ChatInputForm onSend={handleSendQuestion} loading={loading} />
      </div>

      {selectedCitation && (
        <CitationDrawer
          workspaceId={targetWorkspaceId}
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
};

export default ChatPage;
