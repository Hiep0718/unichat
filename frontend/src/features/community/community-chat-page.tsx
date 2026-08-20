import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { useWorkspace } from '../workspaces/workspace-context';
import {
  fetchChannels,
  fetchChannelMessages,
  connectCommunityChat,
  sendCommunityMessage,
  ChannelResponse,
  CommunityMessageResponse,
} from './community-api';
import './community-chat-page.css';

/**
 * Real-time community chat page with WebSocket STOMP messaging.
 */
const CommunityChatPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const workspace = useWorkspace();

  const [, setChannels] = useState<ChannelResponse[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChannelResponse | null>(null);
  const [messages, setMessages] = useState<CommunityMessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load channels
  useEffect(() => {
    if (!workspaceId) return;
    fetchChannels(workspaceId)
      .then((ch) => {
        setChannels(ch);
        if (ch.length > 0 && ch[0]) setActiveChannel(ch[0]);
      })
      .catch(() => { /* handled by empty state */ });
  }, [workspaceId]);

  // Load messages + WebSocket when channel changes
  useEffect(() => {
    if (!workspaceId || !activeChannel) return;

    fetchChannelMessages(workspaceId, activeChannel.id)
      .then((msgs) => {
        setMessages(msgs.reverse()); // API returns DESC, flip to ASC
        setTimeout(scrollToBottom, 100);
      })
      .catch(() => setMessages([]));

    // Connect WebSocket
    const disconnect = connectCommunityChat(
      workspaceId,
      activeChannel.id,
      (msg) => {
        setMessages((prev) => [...prev, msg]);
        if (msg.authorType === 'AI') setAiTyping(false);
        setTimeout(scrollToBottom, 50);
      },
      () => setConnected(true),
    );
    disconnectRef.current = disconnect;

    return () => {
      disconnect();
      setConnected(false);
    };
  }, [workspaceId, activeChannel, scrollToBottom]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !workspaceId || !activeChannel) return;

    sendCommunityMessage(workspaceId, activeChannel.id, trimmed);
    
    if (trimmed.toLowerCase().includes('@ai')) {
      setAiTyping(true);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const highlightAiMention = (text: string) => {
    return text.replace(/@ai/gi, '<span class="at-ai">@AI</span>');
  };

  return (
    <div className="community-chat">
      {/* Header */}
      <div className="community-chat__header">
        <div className="community-chat__header-left">
          <div className="community-chat__channel-icon">
            <Icon name="tag" size={20} />
          </div>
          <div>
            <h2 className="community-chat__channel-name">
              {activeChannel?.name || 'general'}
            </h2>
            <p className="community-chat__channel-desc">
              {activeChannel?.description || workspace?.workspace?.name || 'Kênh thảo luận chung'}
            </p>
          </div>
        </div>
        <div className="community-chat__status">
          <span className="community-chat__status-dot" />
          {connected ? 'Đã kết nối' : 'Đang kết nối...'}
        </div>
      </div>

      {/* Messages */}
      <div className="community-chat__messages">
        {messages.length === 0 ? (
          <div className="community-chat__empty">
            <div className="community-chat__empty-icon">
              <Icon name="forum" size={28} />
            </div>
            <p style={{ font: 'var(--font-headline-md)' }}>Chào mừng đến kênh chat!</p>
            <p>Hãy bắt đầu cuộc trò chuyện đầu tiên. Gõ <strong>@AI</strong> để hỏi trợ lý AI.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`community-msg ${msg.authorType === 'AI' ? 'community-msg--ai' : ''}`}
            >
              <div className="community-msg__avatar">
                {msg.authorType === 'AI' ? (
                  <Icon name="smart_toy" size={18} />
                ) : (
                  msg.authorName?.charAt(0) || '?'
                )}
              </div>
              <div className="community-msg__content">
                <div className="community-msg__meta">
                  <span className="community-msg__author">{msg.authorName}</span>
                  {msg.authorType === 'AI' && (
                    <span className="community-msg__ai-badge">AI</span>
                  )}
                  <span className="community-msg__time">{formatTime(msg.createdAt)}</span>
                </div>
                <p
                  className="community-msg__text"
                  dangerouslySetInnerHTML={{ __html: highlightAiMention(msg.content) }}
                />
              </div>
            </div>
          ))
        )}

        {aiTyping && (
          <div className="community-chat__typing">
            <div className="community-chat__typing-dots">
              <span /><span /><span />
            </div>
            UniChat AI đang suy nghĩ...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="community-chat__input-area">
        <form className="community-chat__input-form" onSubmit={handleSend}>
          <textarea
            className="community-chat__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn... (Shift+Enter xuống dòng, @AI để hỏi trợ lý)"
            rows={1}
          />
          <button
            type="submit"
            className="community-chat__send-btn"
            disabled={!input.trim() || !connected}
            title="Gửi tin nhắn"
          >
            <Icon name="send" size={18} />
          </button>
        </form>
        <p className="community-chat__hint">
          Gõ <strong>@AI</strong> để hỏi trợ lý AI dựa trên tài liệu workspace
        </p>
      </div>
    </div>
  );
};

export default CommunityChatPage;
