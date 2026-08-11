import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { askWorkspaceQuestion, CitationItem } from './chat-api';
import { ChatHeader } from './components/chat-header';
import { ChatWelcome } from './components/chat-welcome';
import { ChatMessageItem, MessageItem } from './components/chat-message-item';
import { ChatInputForm } from './components/chat-input-form';
import { CitationDrawer } from './components/citation-drawer';
import { useWorkspace } from '../workspaces/workspace-context';
import { fetchWorkspaceConversations, fetchConversationDetail } from '../history/conversation-api';
import './chat-page.css';

interface ChatPageProps {
  workspaceId?: string;
}

export const ChatPage: React.FC<ChatPageProps> = ({ workspaceId: propWorkspaceId }) => {
  const params = useParams<{ workspaceId?: string }>();
  const workspaceContext = useWorkspace();
  const targetWorkspaceId = propWorkspaceId || params.workspaceId || workspaceContext?.workspace?.id;

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [conversationTitle, setConversationTitle] = useState<string | undefined>(undefined);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);

  useEffect(() => {
    if (!targetWorkspaceId) return;

    let isMounted = true;
    fetchWorkspaceConversations(targetWorkspaceId)
      .then((res) => {
        if (!isMounted) return;
        const list = res.content || [];
        if (list.length > 0 && list[0]) {
          const latest = list[0];
          setConversationId(latest.id);
          setConversationTitle(latest.title);
          return fetchConversationDetail(targetWorkspaceId, latest.id);
        }
      })
      .then((detail) => {
        if (!isMounted || !detail) return;
        const loadedMessages: MessageItem[] = (detail.messages || []).map((m) => {
          const item: MessageItem = {
            id: m.id,
            role: m.role,
            content: m.content,
          };
          if (m.citations && m.citations.length > 0) {
            item.response = {
              messageId: m.id,
              conversationId: detail.id,
              decision: 'ANSWER',
              answer: m.content,
              intent: 'FACT',
              strategyVersion: 'v1.0',
              citations: m.citations.map((c, i) => ({
                citationId: String(i + 1),
                documentId: c.documentId || '',
                fileName: c.fileName || 'Tài liệu',
                locator: c.locator || '',
                excerpt: c.excerpt || '',
                score: c.score || 0.75,
              })),
              refusalCode: null,
              refusalReason: null,
              requestId: 'history',
            };
          }
          return item;
        });
        setMessages(loadedMessages);
      })
      .catch((err) => {
        console.error('Lỗi tải lịch sử cuộc trò chuyện:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [targetWorkspaceId]);

  if (!targetWorkspaceId) {
    return <div className="chat-page__error">Lỗi: Không tìm thấy Workspace ID</div>;
  }

  const handleSendQuestion = async (userText: string) => {
    if (loading) return;
    setLoading(true);

    const userMsg: MessageItem = {
      id: Date.now().toString(),
      role: 'USER',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await askWorkspaceQuestion(targetWorkspaceId, {
        question: userText,
        conversationId,
      });

      if (!conversationId && res.conversationId) {
        setConversationId(res.conversationId);
      }

      const assistantMsg: MessageItem = {
        id: res.messageId,
        role: 'ASSISTANT',
        content: res.answer || res.refusalReason || 'Không có câu trả lời',
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg: MessageItem = {
        id: Date.now().toString(),
        role: 'ASSISTANT',
        content: err instanceof Error ? err.message : 'Đã xảy ra lỗi khi truy vấn RAG',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
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
          {messages.length === 0 ? (
            <ChatWelcome onSelectPrompt={handleSendQuestion} />
          ) : (
            messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                onSelectCitation={(cit) => setSelectedCitation(cit)}
              />
            ))
          )}
        </div>

        <ChatInputForm onSend={handleSendQuestion} loading={loading} />
      </div>

      {selectedCitation && (
        <CitationDrawer
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
};

export default ChatPage;
