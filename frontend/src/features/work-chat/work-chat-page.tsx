/**
 * Work Chat — messaging people and groups you share a group with.
 * Route: /work-chat
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { ContactPicker } from './components/contact-picker';
import { ConversationList } from './components/conversation-list';
import { GroupCreateModal } from './components/group-create-modal';
import { GroupMembersPanel } from './components/group-members-panel';
import { MessageThread } from './components/message-thread';
import { useWorkChatSocket } from './use-work-chat-socket';
import {
  addGroupMember,
  createGroup,
  leaveGroup,
  removeGroupMember,
} from './group-api';
import {
  fetchConversations,
  fetchMessages,
  markConversationRead,
  openConversation,
  sendMessage,
} from './work-chat-api';
import type { Conversation, DirectMessage } from './work-chat-api';
import './work-chat-page.css';

export function WorkChatPage() {
  // A profile's "Nhắn tin" button opens the conversation it just created, so
  // the page starts on that one rather than on nothing.
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    searchParams.get('conversation'));
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  );

  /**
   * Opens a conversation, closing the members panel on the way.
   *
   * Done here rather than in an effect on `activeId`: setting state from
   * an effect body costs a second render pass for something every caller
   * already knows it is doing.
   */
  const selectConversation = useCallback((conversationId: string | null) => {
    setActiveId(conversationId);
    setShowMembers(false);
  }, []);

  /** Refreshes the list. Called from handlers and callbacks, never as an
   *  effect body, so it never sets state during a render pass. */
  const loadConversations = useCallback(
    () => fetchConversations()
      .then(setConversations)
      .catch(() => setError('Không tải được danh sách trò chuyện.')),
    []);

  useEffect(() => {
    let cancelled = false;
    fetchConversations()
      .then((list) => {
        if (!cancelled) setConversations(list);
      })
      .catch(() => {
        if (!cancelled) setError('Không tải được danh sách trò chuyện.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A pushed message belongs to the open thread or to another one; either way
  // the list needs refreshing so its preview and unread badge stay true.
  const onPushed = useCallback((message: DirectMessage) => {
    setMessages((previous) =>
      message.conversationId === activeId && !previous.some((m) => m.id === message.id)
        ? [message, ...previous]
        : previous);
    void loadConversations();
  }, [activeId, loadConversations]);

  const connected = useWorkChatSocket(onPushed, loadConversations);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    fetchMessages(activeId)
      .then(setMessages)
      .catch(() => setError('Không tải được tin nhắn.'));

    markConversationRead(activeId)
      .then(loadConversations)
      .catch(() => {
        // Read receipts are supplementary; the thread still works without them.
      });
  }, [activeId, loadConversations]);

  const handleSend = async (
    body: string,
    files: readonly File[],
    onProgress?: (percent: number) => void,
  ) => {
    if (!activeId) {
      return;
    }
    const sent = await sendMessage(activeId, body, files, onProgress);
    setMessages((previous) => [sent, ...previous]);
    void loadConversations();
  };

  const handlePick = async (userId: string) => {
    setShowPicker(false);
    try {
      const conversation = await openConversation(userId);
      await loadConversations();
      selectConversation(conversation.id);
    } catch {
      setError('Không mở được cuộc trò chuyện.');
    }
  };

  const handleCreateGroup = async (title: string, memberIds: readonly string[]) => {
    const group = await createGroup(title, memberIds);
    setShowGroupForm(false);
    await loadConversations();
    selectConversation(group.id);
  };

  /** Membership changes come back as the new list, so the row refreshes too. */
  const handleMembership = async (change: () => Promise<unknown>) => {
    await change();
    await loadConversations();
  };

  const handleLeave = async () => {
    if (!activeId) {
      return;
    }
    await leaveGroup(activeId);
    selectConversation(null);
    setMessages([]);
    await loadConversations();
  };

  return (
    <div className="work-chat">
      <aside className="work-chat__sidebar">
        <header className="work-chat__sidebar-header">
          <h1 className="work-chat__title">Tin nhắn</h1>
          <div className="work-chat__new-row">
            <button
              type="button"
              className="work-chat__new"
              onClick={() => setShowPicker(true)}
            >
              <Icon name="add_comment" size={18} />
              <span className="work-chat__new-label">Cuộc trò chuyện mới</span>
            </button>
            <button
              type="button"
              className="work-chat__new-group"
              onClick={() => setShowGroupForm(true)}
              aria-label="Tạo nhóm mới"
            >
              <Icon name="group_add" size={18} />
            </button>
          </div>
        </header>

        {!connected && (
          <p className="work-chat__offline" role="status">
            <Icon name="cloud_off" size={14} />
            Đang kết nối lại — tin nhắn vẫn gửi được.
          </p>
        )}

        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={selectConversation}
        />
      </aside>

      <main className="work-chat__main">
        {error && (
          <p className="work-chat__error" role="alert">
            <Icon name="error_outline" size={16} /> {error}
          </p>
        )}

        {active ? (
          <MessageThread
            conversation={active}
            messages={messages}
            onSend={handleSend}
            onShowMembers={() => setShowMembers(true)}
          />
        ) : (
          <div className="work-chat__empty">
            <Icon name="forum" size={40} />
            <p>Chọn một cuộc trò chuyện, hoặc bắt đầu cuộc mới.</p>
          </div>
        )}
      </main>

      {active && active.kind === 'GROUP' && showMembers && (
        <GroupMembersPanel
          title={active.title}
          participants={active.participants}
          onAdd={(userId) => handleMembership(() => addGroupMember(active.id, userId))}
          onRemove={(userId) => handleMembership(() => removeGroupMember(active.id, userId))}
          onLeave={handleLeave}
          onClose={() => setShowMembers(false)}
        />
      )}

      {showPicker && (
        <ContactPicker onPick={handlePick} onClose={() => setShowPicker(false)} />
      )}

      {showGroupForm && (
        <GroupCreateModal
          onCreate={handleCreateGroup}
          onClose={() => setShowGroupForm(false)}
        />
      )}
    </div>
  );
}

export default WorkChatPage;
