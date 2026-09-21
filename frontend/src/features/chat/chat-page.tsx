import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

import { askWorkspaceQuestion, askWorkspaceQuestionStream, CitationItem, QuestionResponse } from './chat-api';
import { ChatHeader } from './components/chat-header';
import { ChatWelcome } from './components/chat-welcome';
import { ChatMessageItem, MessageItem } from './components/chat-message-item';
import { ChatInputForm } from './components/chat-input-form';
import { KnowledgeStudio, SavedNote, StudioToolType } from './components/knowledge-studio';
import { KnowledgeStudioModal } from './components/knowledge-studio-modal';
import { SavedNoteModal } from './components/saved-note-modal';
import { useWorkspace } from '../workspaces/workspace-context';
import { fetchConversationDetail, createWorkspaceConversation } from '../history/conversation-api';
import { fetchWorkspaceDocuments, DocumentResponse } from '../documents/document-api';
import { fetchConversationStudioNotes, createStudioNote, deleteStudioNote } from './studio-note-api';
import { CreatePostModal } from '../community/components/create-post-modal';
import './chat-page.css';

/** Maximum discussion title length accepted by the Core API. */
const MAX_TITLE_LENGTH = 200;

/** Longest AI answer excerpt quoted into a community post. */
const MAX_ANSWER_EXCERPT = 800;

/**
 * Builds the body of a community post for a question the AI refused to answer.
 * The question itself becomes the post title, so the body only adds context.
 */
const buildEscalationBody = (): string =>
  [
    // The title already carries the question, so the body only adds context.
    'Mình đã hỏi AI câu này nhưng tài liệu hiện có trong Workspace chưa đủ căn cứ để trả lời.',
    '',
    'Mong các thành viên bổ sung thông tin giúp mình.',
  ].join('\n');

/**
 * Builds the body of a community post for a question the AI answered but the
 * user still needs help with. The AI answer is quoted so members can see what
 * the documents already cover and do not repeat it.
 *
 * @param answer the AI answer shown in chat
 */
const buildFollowUpBody = (answer: string): string => {
  const excerpt =
    answer.length > MAX_ANSWER_EXCERPT
      ? `${answer.slice(0, MAX_ANSWER_EXCERPT)}…`
      : answer;

  return [
    'Câu trả lời từ tài liệu chưa giải quyết được thắc mắc của mình.',
    'Bạn nào biết thêm giúp mình với.',
    '',
    '#### AI đã trả lời gì dựa trên tài liệu hiện có',
    '',
    ...excerpt.split('\n').map((line) => `> ${line}`),
  ].join('\n');
};

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
  const navigate = useNavigate();
  const workspaceContext = useWorkspace();

  const targetWorkspaceId =
    propWorkspaceId ||
    params.workspaceId ||
    workspaceContext?.workspace?.id ||
    '';

  const [conversationId, setConversationId] = useState<string | undefined>(
    propConversationId || params.conversationId
  );
  const [conversationTitle, setConversationTitle] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [workspaceDocs, setWorkspaceDocs] = useState<DocumentResponse[]>([]);

  // NotebookLM Knowledge Studio Panel & Modal State
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'STUDIO' | 'CITATIONS'>('STUDIO');
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [activeStudioModal, setActiveStudioModal] = useState<StudioToolType | null>(null);
  const [selectedNoteModal, setSelectedNoteModal] = useState<SavedNote | null>(null);

  // Knowledge-gap escalation: draft of a community question built from a refusal
  const [communityDraft, setCommunityDraft] = useState<{ title: string; body: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesBodyRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  const handleSelectCitation = (cit: CitationItem) => {
    setSelectedCitation(cit);
    setActiveRightTab('CITATIONS');
    setIsStudioOpen(true);
  };

  const handleSaveNote = async (title: string, content: string) => {
    const tempId = String(Date.now());
    const newNote: SavedNote = {
      id: tempId,
      title,
      content,
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setSavedNotes((prev) => [newNote, ...prev]);
    setIsStudioOpen(true);
    setActiveRightTab('STUDIO');

    if (targetWorkspaceId) {
      let activeConvId = conversationId || targetConversationId;
      if (!activeConvId) {
        try {
          const newConv = await createWorkspaceConversation(targetWorkspaceId);
          activeConvId = newConv.id;
          setConversationId(newConv.id);
        } catch (err) {
          console.warn('Tạo cuộc trò chuyện mới để lưu note thất bại:', err);
        }
      }

      if (activeConvId) {
        try {
          const res = await createStudioNote(targetWorkspaceId, activeConvId, {
            noteType: title.includes('Podcast') ? 'PODCAST' : title.includes('Mindmap') ? 'MINDMAP' : 'STUDIO_NOTE',
            title,
            content,
          });
          setSavedNotes((prev) =>
            prev.map((n) => (n.id === tempId ? { ...n, id: res.id } : n))
          );
        } catch (err) {
          console.warn('Lỗi lưu ghi chú vào DB:', err);
        }
      }
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setSavedNotes((prev) => prev.filter((n) => n.id !== noteId));
    const activeConvId = conversationId || targetConversationId;
    if (targetWorkspaceId && activeConvId) {
      try {
        await deleteStudioNote(targetWorkspaceId, activeConvId, noteId);
      } catch (err) {
        console.warn('Lỗi xóa ghi chú khỏi DB:', err);
      }
    }
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  };

  const ensureMessageVisible = (messageId: string) => {
    const element = document.querySelector(`[data-msg-id="${messageId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      scrollToBottom(true);
    }
  };

  const checkIsNearBottom = () => {
    if (!messagesBodyRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesBodyRef.current;
    return scrollHeight - scrollTop - clientHeight < 120;
  };

  const handleMessagesScroll = () => {
    isNearBottomRef.current = checkIsNearBottom();
  };

  const targetConversationId =
    propConversationId || params.conversationId || searchParams.get('conversationId') || undefined;

  useEffect(() => {
    if (targetWorkspaceId) {
      fetchWorkspaceDocuments(targetWorkspaceId, 0, 20)
        .then((res) => {
          if (res?.content) {
            setWorkspaceDocs(res.content);
          }
        })
        .catch((err) => {
          console.warn('Không thể tải danh sách tài liệu workspace:', err);
        });
    }
  }, [targetWorkspaceId]);

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
            setTimeout(() => scrollToBottom(false), 50);
          }
        });

      fetchConversationStudioNotes(targetWorkspaceId, targetConversationId)
        .then((notes) => {
          if (!isMounted) return;
          const mappedNotes: SavedNote[] = (notes || []).map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            createdAt: new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          }));
          setSavedNotes(mappedNotes);
        })
        .catch((err) => {
          console.warn('Lỗi tải studio notes từ DB:', err);
        });
    } else {
      // Start fresh new conversation
      setConversationId(undefined);
      setConversationTitle(undefined);
      setMessages([]);
      setSavedNotes([]);
      setInitialLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [targetWorkspaceId, targetConversationId]);

  useEffect(() => {
    if (!initialLoading && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages.length, initialLoading]);

  if (!targetWorkspaceId) {
    return <div className="chat-page__error">Lỗi: Không tìm thấy Workspace ID</div>;
  }

  const handleSendQuestion = async (userText: string, allowExternalKnowledge: boolean = true) => {
    if (!targetWorkspaceId || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    const userMessage: MessageItem = {
      id: userMsgId,
      role: 'USER',
      content: userText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMessage: MessageItem = {
      id: assistantMsgId,
      role: 'ASSISTANT',
      content: '',
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setLoading(true);

    isNearBottomRef.current = true;
    setTimeout(() => scrollToBottom(true), 20);

    let tokenBuffer = '';
    let isStreamDone = false;
    let streamHasError = false;
    let tokensReceived = false;

    const flushBuffer = () => {
      if (tokenBuffer.length > 0) {
        const remaining = tokenBuffer;
        tokenBuffer = '';
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: m.content + remaining } : m))
        );
        if (isNearBottomRef.current) {
          scrollToBottom(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        flushBuffer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // High-performance Typewriter Queue Ticker (10ms interval with dynamic adaptive chunking)
    const ticker = setInterval(() => {
      if (document.hidden) {
        flushBuffer();
      }
      if (tokenBuffer.length > 0) {
        const len = tokenBuffer.length;
        const chunkSize = len > 100 ? 20 : len > 50 ? 10 : len > 20 ? 5 : 2;
        const charSegment = tokenBuffer.slice(0, chunkSize);
        tokenBuffer = tokenBuffer.slice(chunkSize);

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: m.content + charSegment } : m))
        );
        if (isNearBottomRef.current) {
          scrollToBottom(false);
        }
      } else if (isStreamDone || streamHasError) {
        clearInterval(ticker);
        flushBuffer();
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
        );
        setLoading(false);
        if (isNearBottomRef.current) {
          scrollToBottom(false);
        }
        setTimeout(() => {
          ensureMessageVisible(assistantMsgId);
        }, 120);
      }
    }, 10);

    try {
      await askWorkspaceQuestionStream(
        targetWorkspaceId,
        {
          question: userText,
          conversationId,
          allowExternalKnowledge,
        },
        {
          onThought: (thought) => {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantMsgId) return m;
                const existingThoughts = m.thoughts || [];
                const alreadyHasKey = existingThoughts.some((t) => t.stepKey === thought.stepKey);
                if (alreadyHasKey) {
                  return {
                    ...m,
                    thoughts: existingThoughts.map((t) => (t.stepKey === thought.stepKey ? thought : t)),
                  };
                }
                return {
                  ...m,
                  thoughts: [...existingThoughts, thought],
                };
              })
            );
          },
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
            if (document.hidden) {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, content: m.content + delta } : m))
              );
            } else {
              tokenBuffer += delta;
            }
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
    } finally {
      isStreamDone = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  /**
   * Escalates a chat question to the workspace community, either because the AI
   * refused to answer it or because the user finds the answer incomplete. The
   * user question immediately preceding the reply becomes the post title, and
   * the user reviews the draft before it is published.
   *
   * @param assistantMessage the AI reply the user acted on
   */
  const handleAskCommunity = (assistantMessage: MessageItem) => {
    const replyIndex = messages.findIndex((m) => m.id === assistantMessage.id);
    if (replyIndex < 0) return;

    let question = '';
    for (let i = replyIndex - 1; i >= 0; i -= 1) {
      const candidate = messages[i];
      if (candidate?.role === 'USER') {
        question = candidate.content.trim();
        break;
      }
    }
    if (!question) return;

    const title =
      question.length > MAX_TITLE_LENGTH
        ? `${question.slice(0, MAX_TITLE_LENGTH - 1)}…`
        : question;

    const wasRefused = assistantMessage.response?.decision === 'REFUSE';
    const body = wasRefused
      ? buildEscalationBody()
      : buildFollowUpBody(assistantMessage.content.trim());

    setCommunityDraft({ title, body });
  };

  const handleNewChat = () => {
    setConversationId(undefined);
    setConversationTitle(undefined);
    setMessages([]);
    setSelectedCitation(null);
  };

  return (
    <div className={`chat-layout ${isStudioOpen ? 'chat-layout--studio-open' : ''}`}>
      <div className="chat-page">
        <ChatHeader
          workspaceName={workspaceContext?.workspace?.name}
          conversationTitle={conversationTitle}
          messageCount={messages.length}
          onNewChat={handleNewChat}
          onToggleStudio={() => setIsStudioOpen((prev) => !prev)}
          isStudioOpen={isStudioOpen}
          onToggleDrawer={selectedCitation ? () => setSelectedCitation(null) : undefined}
          hasDrawerOpen={Boolean(selectedCitation)}
        />

        <div className="chat-page__main-content">
          <div className="chat-page__chat-area">
            <div
              className="chat-page__messages-body"
              ref={messagesBodyRef}
              onScroll={handleMessagesScroll}
            >
              {initialLoading ? (
                <ChatSkeletonLoader />
              ) : messages.length === 0 ? (
                <ChatWelcome
                  workspaceName={workspaceContext?.workspace?.name}
                  documents={workspaceDocs}
                  onSelectPrompt={handleSendQuestion}
                />
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessageItem
                      key={msg.id}
                      message={msg}
                      onSelectCitation={handleSelectCitation}
                      onSelectPrompt={handleSendQuestion}
                      onSaveNote={handleSaveNote}
                      onAskCommunity={targetWorkspaceId ? handleAskCommunity : undefined}
                    />
                  ))}
                </>
              )}
              <div ref={messagesEndRef} style={{ height: 1, width: '100%' }} />
            </div>

            <ChatInputForm onSend={handleSendQuestion} loading={loading} />
          </div>

          {isStudioOpen && (
            <KnowledgeStudio
              workspaceName={workspaceContext?.workspace?.name}
              citations={messages.flatMap((m) => m.response?.citations || [])}
              selectedCitation={selectedCitation}
              savedNotes={savedNotes}
              activeTab={activeRightTab}
              onTabChange={(tab) => setActiveRightTab(tab)}
              onSelectCitation={handleSelectCitation}
              onSelectTool={(tool) => setActiveStudioModal(tool)}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onSelectNote={(note) => setSelectedNoteModal(note)}
              onClosePanel={() => setIsStudioOpen(false)}
            />
          )}
        </div>
      </div>

      {activeStudioModal && (
        <KnowledgeStudioModal
          toolType={activeStudioModal}
          workspaceName={workspaceContext?.workspace?.name}
          onSaveNote={handleSaveNote}
          onClose={() => setActiveStudioModal(null)}
        />
      )}

      {communityDraft && (
        <CreatePostModal
          preselectedWorkspaceId={targetWorkspaceId}
          initialTitle={communityDraft.title}
          initialBody={communityDraft.body}
          initialLabel="QUESTION"
          heading="Hỏi cộng đồng"
          onClose={() => setCommunityDraft(null)}
          onCreated={(wsId, discussionId) => {
            setCommunityDraft(null);
            navigate(`/feed/posts/${discussionId}?workspaceId=${wsId}`);
          }}
          onOpenExisting={(wsId, discussionId) => {
            setCommunityDraft(null);
            navigate(`/feed/posts/${discussionId}?workspaceId=${wsId}`);
          }}
        />
      )}

      {selectedNoteModal && (
        <SavedNoteModal
          note={selectedNoteModal}
          onClose={() => setSelectedNoteModal(null)}
          onDeleteNote={handleDeleteNote}
          onSendToChat={handleSendQuestion}
        />
      )}
    </div>
  );
};

export default ChatPage;
